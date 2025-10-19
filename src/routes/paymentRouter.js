// pages/api/payment/cashfree.js
import nc from "next-connect";
import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = global.prisma || new PrismaClient();
const handler = nc().use(express.json());

// --- Config ---
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_ENV = process.env.CASHFREE_ENV || "sandbox";
const FRONTEND_URL = process.env.FRONTEND_URL;
const CASHFREE_BASE_URL =
  CASHFREE_ENV === "sandbox"
    ? "https://sandbox.cashfree.com/pg/orders"
    : "https://www.cashfree.com/pg/orders";
const CASHFREE_HEADERS = {
  "x-client-id": CASHFREE_APP_ID,
  "x-client-secret": CASHFREE_SECRET_KEY,
  "Content-Type": "application/json",
};
const API_VERSION = "2023-08-01";

// --- Helper: verify webhook signature ---
function verifyWebhookSignature(signature, rawBody, secret) {
  if (!signature || !rawBody) return false;
  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  return computedSignature === signature;
}

// --- POST /create-order ---
handler.post(async (req, res) => {
  try {
    const { amount, customerName, customerEmail, customerPhone, deliveryMethod } = req.body;

    if (!deliveryMethod) return res.status(400).json({ error: "deliveryMethod is required" });
    if (typeof amount !== "number" || amount <= 0)
      return res.status(400).json({ error: "Invalid or missing total amount." });

    // --- JWT decode ---
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer "))
      return res.status(401).json({ error: "Authorization token required" });

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = decoded.userId;
    if (!userId) return res.status(401).json({ error: "Token missing userId" });

    // --- 1️⃣ Create order in DB ---
    const order = await prisma.order.create({
      data: {
        user: { connect: { id: userId } },
        totalAmount: amount,
        status: "PENDING",
        deliveryMethod,
      },
    });

    // --- 2️⃣ Create payment record ---
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount,
        status: "PENDING",
        paymentId: null,
      },
    });

    // --- 3️⃣ Call Cashfree API ---
    const cashfreeOrderId = `cf_order_${Date.now()}`;
    const cfPayload = {
      order_id: cashfreeOrderId,
      order_amount: amount.toFixed(2),
      order_currency: "INR",
      customer_details: {
        customer_id: `cust_${userId}`,
        customer_name: customerName || "Guest",
        customer_email: customerEmail || "guest@example.com",
        customer_phone: customerPhone || "9999999999",
      },
      order_meta: { return_url: `${FRONTEND_URL}/orders` },
    };

    const cfResponse = await axios.post(CASHFREE_BASE_URL, cfPayload, { headers: CASHFREE_HEADERS });
    const paymentSessionId = cfResponse.data?.payment_session_id;
    if (!paymentSessionId) return res.status(500).json({ error: "Cashfree session creation failed" });

    res.json({ dbOrderId: order.id, cashfreeOrderId, paymentSessionId });
  } catch (err) {
    console.error("Create order error:", err.response?.data || err.message);
    res.status(500).json({ error: err.message || "Order creation failed" });
  }
});

// --- POST /webhook ---
handler.use(express.raw({ type: "application/json" })); // raw body for signature

handler.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const rawBody = req.body.toString();
    const event = JSON.parse(rawBody);

    if (!verifyWebhookSignature(signature, rawBody, CASHFREE_SECRET_KEY))
      return res.status(403).send("Signature verification failed");

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

// --- GET /check-status/:orderId ---
handler.get("/check-status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.query;

    const cfStatus = await axios.get(`${CASHFREE_BASE_URL}/${orderId}`, { headers: CASHFREE_HEADERS });
    const cashfreeStatus = cfStatus.data.order_status;

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

    res.json({ status: cashfreeStatus, data: cfStatus.data });
  } catch (err) {
    console.error("Check status error:", err.response?.data || err.message);
    res.status(500).json({ error: "Could not verify payment status" });
  }
});

export default handler;
