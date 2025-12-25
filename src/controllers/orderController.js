const express = require("express");
const nodemailer = require("nodemailer");
const { PrismaClient } = require("../../generated/prisma");
const verifyToken = require("../middleware/authMiddleware");

const prisma = new PrismaClient();
const router = express.Router();

router.post("/send-confirmation", verifyToken, async (req, res) => {
  const userId = req.userId;
  const { to, order } = req.body;

  if (
    !to ||
    !order ||
    !order.cartItems ||
    !order.billingDetails ||
    !order.deliveryMethod
  ) {
    return res.status(400).json({ error: "Invalid request data" });
  } // Added 'store' and 'date' to the destructured order object

  const {
    cartItems,
    billingDetails,
    total,
    coupon,
    deliveryMethod,
    store,
    date,
  } = order; // For this example, we'll use a simple object lookup for store details. // In a real application, you would fetch this from your database.

  const storeLocations = {
    hinjewadi: "123 Tech Avenue, Hinjewadi, Pune",
    kothrud: "456 Innovation Road, Kothrud, Pune",
  };
  let selectedStoreAddress = "Store address not found.";
  if (store) {
    // This is the fix! Check if 'store' exists.
    selectedStoreAddress =
      storeLocations[store.toLowerCase()] || "Store address not found.";
  }
  const selectedDate = date
    ? new Date(date).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  try {
    const orderItems = []; // Loop through cart items and find corresponding DB entries

    for (const item of cartItems) {
      const id = parseInt(item.id); // Check item type and find in the correct Prisma model

      if (item.type === "product") {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) continue;
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: item.price,
        });
      } else if (item.type === "accessory") {
        const accessory = await prisma.accessory.findUnique({ where: { id } });
        if (!accessory) continue;
        orderItems.push({
          accessoryId: accessory.id,
          quantity: item.quantity,
          price: item.price,
        });
      } else if (item.type === "part") {
        const part = await prisma.part.findUnique({ where: { id } });
        if (!part) continue;
        orderItems.push({
          partId: part.id,
          quantity: item.quantity,
          price: item.price,
        });
      }
    }

    if (!orderItems.length) {
      return res.status(400).json({ error: "No valid items found in DB." });
    } // Calculate total amount from validated items

    const totalAmount = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    ); // Create a new order record in the database

    const savedOrder = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: "PENDING",
        deliveryMethod: deliveryMethod,
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    }); // Clear the user's cart

    await prisma.cart.deleteMany({ where: { userId } }); // Note: Hardcoded email credentials are a security risk. // In a production environment, use environment variables.

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER, // your email
        pass: process.env.EMAIL_PASS, // app password
      },
    }); // Email 1: Send confirmation to Admin/Store Owner

    const adminDeliveryDetailsHtml =
      deliveryMethod === "homeDelivery"
        ? `<p><strong>Method:</strong> Home Delivery</p>
         <p><strong>Shipping Address:</strong> ${
            billingDetails.streetAddress1
          }, ${billingDetails.streetAddress2 || ""}, ${billingDetails.city}, ${
            billingDetails.state
          }, ${billingDetails.pin}, ${billingDetails.country}</p>`
        : `<p><strong>Method:</strong> Store Visit / In-store Pickup</p>
         <p><strong>Selected Store:</strong> ${store}</p>
         <p><strong>Pickup Date:</strong> ${selectedDate}</p>`;

    const adminHtml = `
      <h2>🧾 New Order Received</h2>
      <p><strong>Order ID:</strong> ${savedOrder.id}</p>
      <p><strong>Customer Name:</strong> ${billingDetails.firstName} ${
      billingDetails.lastName
    }</p>
      <p><strong>Customer Email:</strong> ${billingDetails.email}</p>
      <p><strong>Phone:</strong> ${billingDetails.phone || "N/A"}</p>
      <h3>🚚 Delivery Details:</h3>
      ${adminDeliveryDetailsHtml}
      <p><strong>Notes:</strong> ${billingDetails.notes || "None"}</p>
      <hr/>
      <h3>🛒 Items:</h3>
      <ul>
        ${cartItems
      .map(
        (item) =>
          `<li>${item.name} × ${item.quantity} — ₹${(
            item.price * item.quantity
          ).toFixed(2)}</li>`
      )
      .join("")}
      </ul>
      <p><strong>Total:</strong> ₹${total}</p>
      <p><strong>Coupon:</strong> ${coupon || "None"}</p>
    `;

    await transporter.sendMail({
      from: process.env.DETAILS_EMAIL,
      to: process.env.DETAILS_EMAIL,
      subject: `New Order Received #${savedOrder.id} - ${
        deliveryMethod === "homeDelivery" ? "For Delivery" : "For Pickup"
      }`,
      html: adminHtml,
    }); // Email 2: Send confirmation to Customer

    if (billingDetails.email) {
      const customerDeliveryDetailsHtml =
        deliveryMethod === "homeDelivery"
          ? `<p>Your order will be delivered to the following address:</p>
           <p style="font-family: monospace; background-color: #f4f4f4; padding: 10px; border-radius: 5px;">
             ${billingDetails.firstName} ${billingDetails.lastName}<br>
             ${billingDetails.streetAddress1}<br>
             ${billingDetails.streetAddress2 || ""}${
              billingDetails.streetAddress2 ? "<br>" : ""
            }
             ${billingDetails.city}, ${billingDetails.state} - ${
              billingDetails.pin
            }<br>
             ${billingDetails.country}
           </p>`
          : // Updated to include selected store name and date
            `<p>Your order will be available for <strong>in-store pickup</strong> at our <strong>${store}</strong> location on <strong>${selectedDate}</strong>.</p>
           <p>We'll send you another email notification as soon as it's ready for collection.</p>`;

      const customerHtml = `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2>✅ Your Order is Confirmed!</h2>
          <p>Hi ${billingDetails.firstName},</p>
          <p>Thank you for your order with us. We've received it and are getting it ready for you.</p>
          <p><strong>Order ID:</strong> ${savedOrder.id}</p>
          <p><strong>Order Date:</strong> ${new Date(
        savedOrder.createdAt
      ).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>
          <hr>
          <h3>Order Summary</h3>
          <table style="width:100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border-bottom: 2px solid #ddd; padding: 8px; text-align: left;">Item</th>
                <th style="border-bottom: 2px solid #ddd; padding: 8px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${cartItems
        .map(
          (item) => `
                <tr>
                  <td style="border-bottom: 1px solid #ddd; padding: 8px;">${
            item.name
          } (× ${item.quantity})</td>
                  <td style="border-bottom: 1px solid #ddd; padding: 8px; text-align: right;">₹${(
            item.price * item.quantity
          ).toFixed(2)}</td>
                </tr>
              `
        )
        .join("")}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 8px; text-align: right;"><strong>Total:</strong></td>
                <td style="padding: 8px; text-align: right;"><strong>₹${total}</strong></td>
              </tr>
            </tfoot>
          </table>
          <hr>
          <h3>Delivery Information</h3>
          ${customerDeliveryDetailsHtml}
          <p>We'll keep you updated on the status of your order.</p>
          <p>Thanks again for your purchase!</p>
        </div>
      `;

      await transporter.sendMail({
        from: '"MaxTech India" <sales.maxtechindia.in@gmail.com>',
        to: billingDetails.email,
        subject: `Your Order Confirmation #${savedOrder.id}`,
        html: customerHtml,
      });
    }

    return res.status(200).json({
      success: true,
      message: "✅ Order placed and emails sent successfully",
      data: savedOrder,
    });
  } catch (error) {
    // This is the key change. We now log the full error object as a string.
    console.error("❌ Order/email error:", JSON.stringify(error, null, 2));
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/contact-us", async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !phone || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Ensure you have a recipient email
    const recipientEmail =
      process.env.DETAILS_EMAIL;
    if (!recipientEmail) {
      return res.status(500).json({ error: "Recipient email not configured" });
    }

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email content
    const mailOptions = {
      from: `"${name}" <${email}>`,
      to: recipientEmail, // <— This must be defined!
      subject: `📩 New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong><br/> ${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res
      .status(200)
      .json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

router.post("/contact-us-form", async (req, res) => {
  try {
    const { to, formData } = req.body;

    if (!to || !formData) {
      return res.status(400).json({ error: "Invalid request data" });
    }

    const {
      fullName,
      email,
      phone,
      deviceBrand,
      issueType,
      description,
      selectedIssueFromIcons,
      contactMethod,
      uploadedFiles,
    } = formData;

    // Configure Nodemailer transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailHtml = `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Phone:</strong> ${phone}</p>
      <p><strong>Device Brand:</strong> ${deviceBrand}</p>
      <p><strong>Issue Type:</strong> ${issueType}</p>
      <p><strong>Selected Issue:</strong> ${selectedIssueFromIcons}</p>
      <p><strong>Description:</strong> ${description}</p>
      <p><strong>Preferred Contact Method:</strong> ${contactMethod}</p>
      ${
        uploadedFiles && uploadedFiles.length
          ? `<p><strong>Uploaded Files:</strong> ${uploadedFiles.join(
              ", "
            )}</p>`
          : ""
      }
    `;

    await transporter.sendMail({
      from: email,
      to,
      subject: `Contact Form Submission from ${fullName}`,
      html: mailHtml,
    });

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Contact form error:", error);
    return res.status(500).json({ error: "Failed to send email" });
  }
});

router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user)
      return res.status(401).json({ error: "Unauthorized: User not found" });

    const isSuperAdmin = user.role === "SUPER_ADMIN";
    console.log("Logged in user ID:", user.id);
    console.log("User Role:", user.role);
    console.log("Is Super Admin:", isSuperAdmin);

    const orders = await prisma.order.findMany({
      where: isSuperAdmin ? {} : { userId: user.id },
      include: {
        items: {
          include: {
            product: true,
            accessory: true,
            part: true, // included parts here
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Fetched ${orders.length} order(s) for ${user.role}`);

    res.status(200).json({ success: true, orders });
  } catch (err) {
    console.error("❌ Error fetching orders:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.role !== "SUPER_ADMIN")
      return res.status(403).json({ error: "Forbidden" });

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    res.status(200).json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error("❌ Error updating order:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.role !== "SUPER_ADMIN")
      return res.status(403).json({ error: "Forbidden" });

    await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } });
    await prisma.order.delete({ where: { id: req.params.id } });

    res
      .status(200)
      .json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting order:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
