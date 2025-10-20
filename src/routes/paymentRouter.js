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
// Use the base URL for the frontend checkout page where the redirect handler is
const FRONTEND_CHECKOUT_URL = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/checkout` : "http://localhost:3000/checkout";


// Cashfree API endpoint URLs
const CASHFREE_ORDERS_URL =
  CASHFREE_ENV === "sandbox"
    ? "https://sandbox.cashfree.com/pg/orders"
    : "https://api.cashfree.com/pg/orders";

// Cashfree headers
const CASHFREE_HEADERS = {
  "x-client-id": CASHFREE_APP_ID,
  "x-client-secret": CASHFREE_SECRET_KEY,
  "x-api-version": API_VERSION,
  "Content-Type": "application/json",
};

// --- Utility Functions ---
function verifyWebhookSignature(signature, rawBody, secret) {
  if (!signature || !rawBody) return false;
  const computedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");
  return computedSignature === signature;
}

// Function to fetch order status from Cashfree API
async function getCashfreeOrderStatus(cashfreeOrderId) {
  const response = await axios.get(`${CASHFREE_ORDERS_URL}/${cashfreeOrderId}`, { headers: CASHFREE_HEADERS });
  return response.data;
}

// ----------------------------------------------------
// --- 1. Create Order (Initiates Payment) ---
// ----------------------------------------------------
router.post("/create-order", async (req, res) => {
  try {
    const { amount, customerName, customerEmail, customerPhone, deliveryMethod } = req.body;

    if (!deliveryMethod) return res.status(400).json({ error: "deliveryMethod is required" });
    if (typeof amount !== "number" || amount <= 0)
      return res.status(400).json({ error: "Invalid or missing total amount." });

    // --- Authorization (JWT is a placeholder here, assuming you handle it properly) ---
    // IMPORTANT: In a real app, JWT decoding and user retrieval should be handled by middleware
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "Authorization token is required" });

    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      // Use your actual JWT secret here
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key'); 
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const userId = decoded.userId;
    if (!userId) return res.status(401).json({ error: "Token does not contain userId" });


    // 1️⃣ Create a unique order ID for Cashfree
    // It's better to use a unique prefix for your internal DB ID if possible
    const cashfreeOrderId = `cf_order_${Date.now()}`; 
    
    // 2️⃣ CRITICAL FIX: The return URL MUST include the Cashfree order_id and order_token
    // This ensures the frontend's useEffect can identify the transaction.
    const returnUrl = `${FRONTEND_CHECKOUT_URL}?order_id={order_id}&order_token={order_token}`
 

    // 3️⃣ Create order in DB (Initial PENDING state)
    const order = await prisma.order.create({
      data: {
        user: { connect: { id: userId } },
        totalAmount: amount,
        status: "PENDING_PAYMENT", // Use a specific status
        deliveryMethod,
      },
    });

    // 4️⃣ Create payment record linked to the internal DB Order
    await prisma.payment.create({
      data: {
        orderId: order.id,
        cashfreeOrderId: cashfreeOrderId, // Store Cashfree ID for later lookup
        amount,
        status: "PENDING", 
        paymentId: null,
      },
    });

    // 5️⃣ Call Cashfree API
    const cashfreeAmountString = amount.toFixed(2);
    const cfResponse = await axios.post(
      CASHFREE_ORDERS_URL,
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
        order_meta: { 
          return_url: returnUrl,
          // OPTIONAL: Add a custom field to identify your internal order ID easily
          notify_url: `${FRONTEND_CHECKOUT_URL}/webhook`, // Use your actual webhook URL
          customer_data: JSON.stringify({ dbOrderId: order.id }) 
        } 
      },
      { headers: CASHFREE_HEADERS }
    );

    const paymentSessionId = cfResponse.data?.payment_session_id;
    if (!paymentSessionId) {
      console.error("Cashfree did not return a session ID:", cfResponse.data);
      return res.status(500).json({ error: "Failed to create Cashfree payment session" });
    }

    res.json({
      dbOrderId: order.id,
      cashfreeOrderId,
      paymentSessionId
    });
  } catch (error) {
    console.error("Full error creating order:", error);
    if (error.response?.data) console.error("Cashfree API response:", error.response.data);
    res.status(500).json({ error: error.message || "Order creation failed" });
  }
});

// ----------------------------------------------------
// --- 2. Verify Payment (Frontend Callback Endpoint) ---
// ----------------------------------------------------
router.post("/verify-payment", async (req, res) => {
  const { cashfreeOrderId } = req.body; // Use cashfreeOrderId from frontend/redirect

  try {
    if (!cashfreeOrderId) {
      return res.status(400).json({ message: "Missing Cashfree Order ID." });
    }

    // 1️⃣ Check Cashfree status
    const cfOrderDetails = await getCashfreeOrderStatus(cashfreeOrderId);
    const cashfreeStatus = cfOrderDetails.order_status;

    if (cashfreeStatus !== "PAID") {
      // Payment was not successful (e.g., failed, user abandoned)
      return res.status(200).json({ 
        is_successful: false, 
        message: `Payment status is ${cashfreeStatus}. Please try again.`,
        payment_details: cfOrderDetails
      });
    }

    // 2️⃣ Find the internal payment record using the Cashfree Order ID
    const paymentRecord = await prisma.payment.findUnique({
      where: { cashfreeOrderId: cashfreeOrderId },
      include: { order: true },
    });

    if (!paymentRecord) {
      console.error("Payment record not found for Cashfree ID:", cashfreeOrderId);
      return res.status(404).json({ message: "Order not found in internal database." });
    }
    
    // 3️⃣ Update internal DB status to SUCCESS (if not already done by webhook)
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentRecord.id },
      data: {
        status: "SUCCESS",
        paymentId: cfOrderDetails.cf_payment_id,
        rawWebhookData: JSON.stringify(cfOrderDetails) // Store final details
      },
    });

    // 4️⃣ Finalize the main order status
    await prisma.order.update({
      where: { id: paymentRecord.order.id },
      data: { status: "PROCESSING" },
    });


    // 5️⃣ Send success response back to frontend to finalize order creation/clear cart
    res.json({
      is_successful: true,
      message: "Payment verified and order finalized.",
      payment_details: { 
        cf_payment_id: cfOrderDetails.cf_payment_id, 
        cf_order_id: cashfreeOrderId,
        internal_order_id: paymentRecord.order.id,
        amount: cfOrderDetails.order_amount 
      }
    });

  } catch (error) {
    console.error("Error verifying payment:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to verify payment status securely." });
  }
});


// ----------------------------------------------------
// --- 3. Webhook (Async update) ---
// ----------------------------------------------------
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  try {
    const signature = req.headers["x-webhook-signature"];
    const rawBody = req.body.toString();
    const event = JSON.parse(rawBody);
    
    // Use the secret key for verification
    if (!verifyWebhookSignature(signature, rawBody, CASHFREE_SECRET_KEY)) 
      return res.status(403).send("Signature verification failed");

    const cfOrderId = event.data.order.order_id;
    
    // Find the internal payment record using Cashfree Order ID
    const paymentRecord = await prisma.payment.findUnique({
      where: { cashfreeOrderId: cfOrderId },
    });

    if (!paymentRecord) {
      console.error("Webhook received for unknown Cashfree Order ID:", cfOrderId);
      return res.sendStatus(200); // Acknowledge to prevent retries
    }

    const updateData = { rawWebhookData: JSON.stringify(event) };
    let orderStatus = null;

    if (event.type === "PAYMENT_SUCCESS") {
      updateData.status = "SUCCESS";
      updateData.paymentId = event.data.payment.cf_payment_id;
      orderStatus = "PROCESSING";
    } else if (event.type === "PAYMENT_FAILED" || event.type === "PAYMENT_CANCELLED") {
      updateData.status = "FAILED";
      orderStatus = "FAILED";
    } else {
      // Handle other events like PENDING, etc., if needed
      return res.sendStatus(200);
    }
    
    // Update Payment Record
    await prisma.payment.update({ where: { id: paymentRecord.id }, data: updateData });

    // Update main Order status
    if (orderStatus) {
      await prisma.order.update({ where: { id: paymentRecord.orderId }, data: { status: orderStatus } });
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error("Webhook error:", error);
    // Always return 200 or Cashfree will keep retrying indefinitely
    res.sendStatus(200); 
  }
});


// ----------------------------------------------------
// --- 4. Check status (Manual lookup, deprecated by verify) ---
// ----------------------------------------------------
router.get("/check-status/:cashfreeOrderId", async (req, res) => {
  const { cashfreeOrderId } = req.params;
  try {
    const cfStatus = await getCashfreeOrderStatus(cashfreeOrderId);
    
    // Renamed endpoint variable to reflect the ID it takes
    const paymentRecord = await prisma.payment.findUnique({
      where: { cashfreeOrderId: cashfreeOrderId },
    });
    
    if (!paymentRecord) {
      return res.status(404).json({ error: "Order not found in DB." });
    }

    if (cfStatus.order_status === "PAID" || cfStatus.order_status === "ACTIVE") {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { status: "SUCCESS" },
      });
      await prisma.order.update({
        where: { id: paymentRecord.orderId },
        data: { status: "PROCESSING" },
      });
    }

    res.json({ status: cfStatus.order_status, data: cfStatus });
  } catch (error) {
    console.error("Error checking order status:", error.response?.data || error);
    res.status(500).json({ error: "Could not verify payment status" });
  }
});

module.exports = router;