const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { PrismaClient } = require("../../generated/prisma");
const jwt = require("jsonwebtoken");

const router = express.Router();
const prisma = global.prisma || new PrismaClient();

// --- Configuration ---
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV = process.env.CASHFREE_ENV || "sandbox";
const API_VERSION = "2023-08-01";
const FRONTEND_URL = process.env.FRONTEND_URL;

// --- Cashfree endpoints ---
const CASHFREE_BASE_URL =
  CASHFREE_ENV === "sandbox"
    ? "https://sandbox.cashfree.com/pg/orders"
    : "https://api.cashfree.com/pg/orders";

const CASHFREE_HEADERS = {
  "x-client-id": CASHFREE_APP_ID,
  "x-client-secret": CASHFREE_SECRET_KEY,
  "x-api-version": API_VERSION,
  "Content-Type": "application/json",
};

// --- Verify webhook signature ---
function verifyWebhookSignature(signature, rawBody, secret) {
  if (!signature || !rawBody) return false;
  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  return computedSignature === signature;
}

// --- 1️⃣ Create Order ---
router.post("/create-order", async (req, res) => {
  try {
    const { amount, customerName, customerEmail, customerPhone, deliveryMethod } = req.body;
    if (!deliveryMethod) return res.status(400).json({ error: "deliveryMethod is required" });
    if (typeof amount !== "number" || amount <= 0)
      return res.status(400).json({ error: "Invalid or missing total amount." });

    // --- Decode JWT token ---
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "Authorization token is required" });

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = decoded.userId;
    if (!userId) return res.status(401).json({ error: "Token does not contain userId" });

    // --- Create order in DB ---
    const order = await prisma.order.create({
      data: {
        user: { connect: { id: userId } },
        totalAmount: amount,
        status: "PENDING",
        deliveryMethod,
      },
    });

    const cashfreeOrderId = `cf_order_${Date.now()}`;
    const returnUrl = `${FRONTEND_URL}/payment-success?orderId=${cashfreeOrderId}`;

    await prisma.order.update({
      where: { id: order.id },
      data: { cashfreeOrderId },
    });

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount,
        status: "PENDING",
        paymentId: null,
      },
    });

    // --- Create order in Cashfree ---
    const cfResponse = await axios.post(
      CASHFREE_BASE_URL,
      {
        order_id: cashfreeOrderId,
        order_amount: amount.toFixed(2),
        order_currency: "INR",
        customer_details: {
          customer_id: `cust_${userId}`,
          customer_name: customerName || "Guest",
          customer_email: customerEmail || "guest@example.com",
          customer_phone: customerPhone || "9999999999",
        },
        order_meta: { return_url: returnUrl },
      },
      { headers: CASHFREE_HEADERS }
    );

    const paymentSessionId = cfResponse.data?.payment_session_id;
    if (!paymentSessionId) {
      console.error("❌ Cashfree missing session ID:", cfResponse.data);
      return res.status(500).json({ error: "Failed to create Cashfree payment session" });
    }

    console.log("✅ Cashfree order created:", {
      dbOrderId: order.id,
      cashfreeOrderId,
      paymentSessionId,
    });

    res.json({ dbOrderId: order.id, cashfreeOrderId, paymentSessionId });
  } catch (error) {
    console.error("Full error creating order:", error.response?.data || error.message);
    res.status(500).json({ error: error.message || "Order creation failed" });
  }
});

// --- 2️⃣ Webhook ---
router.post("/webhook", async (req, res) => {
  try {
    const rawBody = typeof req.body === "string" ? req.body : JSON.stringify(req.body);

    let verified = true;
    if (CASHFREE_ENV !== "sandbox") {
      const signature = req.headers["x-webhook-signature"];
      verified = verifyWebhookSignature(signature, rawBody, CASHFREE_SECRET_KEY);
    }

    if (!verified) {
      console.error("❌ Invalid Cashfree webhook signature");
      return res.status(403).send("Invalid signature");
    }

    const event = JSON.parse(rawBody);
    console.log("🔔 Webhook received:", event.type);

    // --- Handle successful payments ---
    if (event.type === "PAYMENT_SUCCESS") {
      const { order, payment } = event.data;
      const cashfreeOrderId = order.order_id;

      const dbOrder = await prisma.order.findFirst({
        where: { cashfreeOrderId },
        include: { user: true },
      });

      if (!dbOrder) {
        console.error("❌ No DB order found for:", cashfreeOrderId);
        return res.status(404).send("Order not found");
      }

      await prisma.payment.updateMany({
        where: { orderId: dbOrder.id },
        data: {
          paymentId: payment.payment_id,
          status: "SUCCESS",
          amount: payment.order_amount,
          currency: payment.order_currency,
          paymentMethod: payment.payment_method,
          rawWebhookData: JSON.stringify(event),
        },
      });

      await prisma.order.update({
        where: { id: dbOrder.id },
        data: { status: "PAID" },
      });

      console.log("✅ Payment recorded for:", dbOrder.id);
    }

    // --- Handle failed payments ---
    if (event.type === "PAYMENT_FAILED") {
      const { order } = event.data;
      const cashfreeOrderId = order.order_id;

      const dbOrder = await prisma.order.findFirst({ where: { cashfreeOrderId } });
      if (dbOrder) {
        await prisma.payment.updateMany({
          where: { orderId: dbOrder.id },
          data: { status: "FAILED", rawWebhookData: JSON.stringify(event) },
        });
        await prisma.order.update({
          where: { id: dbOrder.id },
          data: { status: "FAILED" },
        });
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error.message);
    res.sendStatus(200); // prevents Cashfree retry spam
  }
});

// --- 3️⃣ Check Payment Status ---
router.get("/check-status/:orderId", async (req, res) => {
  const { orderId } = req.params;
  try {
    const cfStatus = await axios.get(`${CASHFREE_BASE_URL}/${orderId}`, {
      headers: CASHFREE_HEADERS,
    });

    const cashfreeStatus = cfStatus.data.order_status;
    res.json({ status: cashfreeStatus, data: cfStatus.data });
  } catch (error) {
    console.error("Check status error:", error.response?.data || error.message);
    res.status(500).json({ error: "Could not verify payment status" });
  }
});

// --- 4️⃣ Cancel Payment ---
router.post("/cancel", async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: "orderId is required" });

    await prisma.payment.updateMany({
      where: { orderId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    await prisma.order.updateMany({
      where: { id: orderId, status: "PENDING" },
      data: { status: "CANCELLED" },
    });

    res.json({ message: "Payment cancelled successfully" });
  } catch (err) {
    console.error("Cancel payment error:", err);
    res.status(500).json({ error: "Failed to cancel payment" });
  }
});

// --- 5️⃣ Manual Verify Endpoint ---
router.post("/verify", async (req, res) => {
  const { orderId } = req.body;

  try {
    const response = await axios.get(
      `https://sandbox.cashfree.com/pg/orders/${orderId}`,
      {
        headers: {
          accept: "application/json",
          "x-client-id": CASHFREE_APP_ID,
          "x-client-secret": CASHFREE_SECRET_KEY,
          "x-api-version": "2023-08-01",
        },
      }
    );

    const orderStatus = response.data.order_status;

    if (orderStatus === "PAID") {
      await prisma.payment.updateMany({
        where: { order: { cashfreeOrderId: orderId } },
        data: { status: "SUCCESS" },
      });

      await prisma.order.updateMany({
        where: { cashfreeOrderId: orderId },
        data: { status: "CONFIRMED" },
      });

      return res.json({ status: "SUCCESS", message: "Payment verified successfully." });
    }

    await prisma.payment.updateMany({
      where: { order: { cashfreeOrderId: orderId } },
      data: { status: "FAILED" },
    });

    await prisma.order.updateMany({
      where: { cashfreeOrderId: orderId },
      data: { status: "CANCELLED" },
    });

    return res.json({ status: "FAILED", message: "Payment failed or cancelled." });
  } catch (error) {
    console.error("Cashfree verify error:", error.response?.data || error.message);
    res.status(500).json({
      status: "FAILED",
      message: "Error verifying payment",
      error: error.response?.data || error.message,
    });
  }
});

module.exports = router;
