// src/routes/paymentRouter.js
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { PrismaClient } = require("../../generated/prisma");
const jwt = require("jsonwebtoken");

const router = express.Router();
const prisma = global.prisma || new PrismaClient();

// --- Config ---
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV = process.env.CASHFREE_ENV || "sandbox";
const API_VERSION = "2023-08-01";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const CASHFREE_BASE_URL =
  CASHFREE_ENV === "sandbox"
    ? "https://sandbox.cashfree.com/pg/orders"
    : "https://www.cashfree.com/pg/orders";

const CASHFREE_HEADERS = {
  "x-client-id": CASHFREE_APP_ID,
  "x-client-secret": CASHFREE_SECRET_KEY,
  "x-api-version": API_VERSION,
  "Content-Type": "application/json",
};

// --- Verify webhook ---
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
  console.log("Incoming /create-order request:", req.body);

  try {
    const { amount, customerName, customerEmail, customerPhone, deliveryMethod } = req.body;

    if (!deliveryMethod) return res.status(400).json({ error: "deliveryMethod is required" });
    if (typeof amount !== "number" || amount <= 0)
      return res.status(400).json({ error: "Invalid or missing amount" });

    // --- JWT Verification ---
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ error: "Authorization token required" });

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = decoded.userId;
    if (!userId) return res.status(401).json({ error: "Token missing userId" });

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
    const returnUrl = `${FRONTEND_URL}/orders`;

    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount,
        status: "PENDING",
        paymentId: null,
      },
    });

    const cashfreeBody = {
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
    };

    console.log("Sending to Cashfree:", cashfreeBody);

    const cfResponse = await axios.post(CASHFREE_BASE_URL, cashfreeBody, {
      headers: CASHFREE_HEADERS,
    });

    const paymentSessionId = cfResponse.data?.payment_session_id;
    if (!paymentSessionId) {
      console.error("Cashfree did not return payment_session_id:", cfResponse.data);
      return res.status(500).json({ error: "Failed to create Cashfree payment session" });
    }

    res.json({ dbOrderId: order.id, cashfreeOrderId, paymentSessionId });
  } catch (error) {
    console.error("Error in /create-order:", error.response?.data || error.message || error);
    res.status(500).json({ error: error.message || "Order creation failed" });
  }
});

// --- 2️⃣ Webhook ---
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const rawBody = req.body.toString();
    const event = JSON.parse(rawBody);

    if (!verifyWebhookSignature(signature, rawBody, CASHFREE_SECRET_KEY)) {
      console.warn("Webhook signature verification failed");
      return res.status(403).send("Signature verification failed");
    }

    if (event.type === "PAYMENT_SUCCESS") {
      const { order, payment } = event.data;
      await prisma.payment.updateMany({
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
      await prisma.payment.updateMany({
        where: { orderId: order.order_id },
        data: { status: "FAILED", rawWebhookData: JSON.stringify(event) },
      });
    }

    res.sendStatus(200);
  } catch (err) {
    console.error("Webhook error:", err);
    res.sendStatus(200); // prevent retries
  }
});

// --- 3️⃣ Check order status ---
router.get("/check-status/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const cfStatus = await axios.get(`${CASHFREE_BASE_URL}/${orderId}`, { headers: CASHFREE_HEADERS });
    const status = cfStatus.data.order_status;

    if (["PAID", "ACTIVE"].includes(status)) {
      await prisma.payment.updateMany({
        where: { orderId, status: { not: "SUCCESS" } },
        data: { status: "SUCCESS" },
      });
    } else if (status === "FAILED") {
      await prisma.payment.updateMany({
        where: { orderId, status: { not: "FAILED" } },
        data: { status: "FAILED" },
      });
    }

    res.json({ status, data: cfStatus.data });
  } catch (err) {
    console.error("Check status error:", err.response?.data || err);
    res.status(500).json({ error: "Could not verify payment status" });
  }
});

module.exports = router;
