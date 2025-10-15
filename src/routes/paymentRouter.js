const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { PrismaClient } = require("../../generated/prisma");
const  jwt = require('jsonwebtoken');
const router = express.Router();
const prisma = global.prisma || new PrismaClient();

// --- Configuration ---
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV = process.env.CASHFREE_ENV || "sandbox";
const API_VERSION = "2023-08-01";

const BASE_URL = "http://localhost:3000"
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


router.post("/create-order", async (req, res) => {
  try {
    const { amount, customerName, customerEmail, customerPhone, deliveryMethod } = req.body;

    if (!deliveryMethod) {
      return res.status(400).json({ error: "deliveryMethod is required" });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: "Invalid or missing total amount." });
    }

    // --- Decode token once ---
    const token = req.headers.authorization?.split(" ")[1]; // Expect: Bearer <token>
    if (!token) {
      return res.status(401).json({ error: "Authorization token is required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded token:", decoded);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = decoded.userId; // ✅ matches your JWT payload

    // 1️⃣ Create order in DB
    const order = await prisma.order.create({
      data: {
        user: { connect: { id: userId } },
        totalAmount: amount,
        status: "PENDING",
        deliveryMethod,
      },
    });

    // 2️⃣ Cashfree order ID & return URL
    const cashfreeOrderId = `cf_order_${Date.now()}`;
    const returnUrl = `${process.env.FRONTEND_URL}/payment-status?order_id=${cashfreeOrderId}&dbOrderId=${order.id}`;

    // 3️⃣ Create payment record
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: amount,
        status: "PENDING",
        paymentId: null,
      },
    });

    // 4️⃣ Call Cashfree API
    const cashfreeAmountString = amount.toFixed(2);

    const response = await axios.post(
      BASE_URL,
      {
        order_id: cashfreeOrderId,
        order_amount: cashfreeAmountString,
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

    res.json({
      dbOrderId: order.id,
      cashfreeOrderId,
      paymentSessionId: response.data.payment_session_id,
    });
  } catch (error) {
    console.error("Full error creating order:", error);
    if (error.response?.data) {
      console.error("Cashfree API response:", error.response.data);
    }
    res.status(500).json({ error: error.message || "Order creation failed" });
  }
});

// --- 2. Webhook: Cashfree → Backend ---
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const rawBody = req.body.toString();
    const event = JSON.parse(rawBody);

    if (!verifyWebhookSignature(signature, rawBody, CASHFREE_SECRET_KEY)) {
      console.warn("Webhook signature mismatch. Rejecting request.");
      return res.status(403).send("Signature verification failed");
    }

    if (event.type === "PAYMENT_SUCCESS") {
      const { order, payment } = event.data;

      await prisma.payment.update({
        where: { orderId: order.order_id },
        data: {
          paymentId: payment.payment_id,
          status: "SUCCESS",
          amount: payment.order_amount,
          currency: payment.order_currency,
          paymentMethod: payment.payment_method,
          rawWebhookData: JSON.stringify(event),
        },
      });
    }

    if (event.type === "PAYMENT_FAILED") {
      const { order } = event.data;

      await prisma.payment.update({
        where: { orderId: order.order_id },
        data: { status: "FAILED", rawWebhookData: JSON.stringify(event) },
      });
    }

    // Respond 200 to acknowledge receipt
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    res.sendStatus(200); // Prevent repeated retries
  }
});

// --- 3. Check final order status from Cashfree ---
router.get("/check-status/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const response = await axios.get(`${BASE_URL}/${orderId}`, { headers: CASHFREE_HEADERS });
    const cashfreeStatus = response.data.order_status; // e.g., PAID, ACTIVE, FLAGGED

    if (cashfreeStatus === "PAID" || cashfreeStatus === "ACTIVE") {
      await prisma.payment.updateMany({
        where: { orderId, status: { not: "SUCCESS" } },
        data: { status: "SUCCESS" },
      });
    }

    if (cashfreeStatus === "FAILED") {
      await prisma.payment.updateMany({
        where: { orderId, status: { not: "FAILED" } },
        data: { status: "FAILED" },
      });
    }

    res.json({ status: cashfreeStatus, data: response.data });
  } catch (error) {
    console.error("Error checking order status:", error.response?.data || error);
    res.status(500).json({ error: "Could not verify payment status" });
  }
});

module.exports = router;
