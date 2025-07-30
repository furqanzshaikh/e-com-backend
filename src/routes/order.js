// const express = require('express');
// const nodemailer = require('nodemailer');
// const { PrismaClient } = require('../../generated/prisma');
// const verifyToken = require('../middleware/authMiddleware');

// const prisma = new PrismaClient();
// const router = express.Router();

// router.post('/send-confirmation', verifyToken, async (req, res) => {
//   const userId = req.userId;
//   const { to, order } = req.body;

//   if (!to || !order || !order.cartItems || !order.billingDetails) {
//     return res.status(400).json({ error: 'Invalid request data' });
//   }

//   const { cartItems, billingDetails, total, coupon } = order;

//   try {
//     // 1. Prepare order items
//     const orderItems = cartItems
//       .map((item) => {
//         const isProduct = !!item.productId;
//         const isAccessory = !!item.accessoryId;

//         if (!isProduct && !isAccessory) return null;

//         return {
//           productId: isProduct ? item.productId : undefined,
//           accessoryId: isAccessory ? item.accessoryId : undefined,
//           quantity: item.quantity,
//           price: parseFloat(item.price),
//         };
//       })
//       .filter((item) => item !== null);

//     if (!orderItems.length) {
//       return res.status(400).json({ error: 'No valid order items.' });
//     }

//     // 2. Save order to DB
//     const savedOrder = await prisma.order.create({
//       data: {
//         userId,
//         totalAmount: parseFloat(total),
//         status: 'PENDING',
//         items: {
//           create: orderItems,
//         },
//       },
//       include: { items: true },
//     });

//     // 3. Clear cart
//     await prisma.cart.deleteMany({ where: { userId } });

//     // 4. Prepare email HTML
//     const html = `
//       <h2>🧾 New Order Received</h2>
//       <p><strong>Name:</strong> ${billingDetails.firstName} ${billingDetails.lastName}</p>
//       <p><strong>Address:</strong> ${billingDetails.streetAddress1}, ${billingDetails.streetAddress2}, ${billingDetails.city}, ${billingDetails.state}, ${billingDetails.pin}, ${billingDetails.country}</p>
//       <p><strong>Email:</strong> ${billingDetails.email}</p>
//       <p><strong>Phone:</strong> ${billingDetails.phone || 'N/A'}</p>
//       <p><strong>Notes:</strong> ${billingDetails.notes || 'None'}</p>
//       <hr/>
//       <h3>🛒 Items:</h3>
//       <ul>
//         ${cartItems
//           .map(
//             (item) =>
//               `<li>${item.name} × ${item.quantity} — ₹${(item.price * item.quantity).toFixed(2)}</li>`
//           )
//           .join('')}
//       </ul>
//       <p><strong>Total:</strong> ₹${total}</p>
//       <p><strong>Coupon:</strong> ${coupon || 'None'}</p>
//     `;

//     // 5. Send email
//     const transporter = nodemailer.createTransport({
//       service: 'gmail',
//       auth: {
//         user: 'furqanshaikh939@gmail.com',
//         pass: 'smdj irys luou kzve',
//       },
//     });

//     await transporter.sendMail({
//       from: 'furqanshaikh939@gmail.com',
//       to,
//       subject: '🧾 New Order Received',
//       html,
//     });

//     return res.status(200).json({
//       success: true,
//       message: '✅ Order saved and email sent',
//       data: savedOrder,
//     });
//   } catch (error) {
//     console.error('❌ Order/email failed:', error);
//     return res.status(500).json({ error: 'Something went wrong while saving order or sending email' });
//   }
// });

// module.exports = router;
