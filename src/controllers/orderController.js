const express = require('express');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('../../generated/prisma');
const verifyToken = require('../middleware/authMiddleware');

const prisma = new PrismaClient();
const router = express.Router();

router.post('/send-confirmation', verifyToken, async (req, res) => {
  const userId = req.userId;
  const { to, order } = req.body;

  if (!to || !order || !order.cartItems || !order.billingDetails) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  const { cartItems, billingDetails, total, coupon } = order;


  try {
    const orderItems = [];

    for (const item of cartItems) {
      const id = parseInt(item.id);

      if (item.type === 'product') {
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) continue;

        orderItems.push({
          productId: product.id,
          accessoryId: null,
          quantity: item.quantity,
          price: item.price, // ✅ use price from frontend/cart
        });
      } else if (item.type === 'accessory') {
        const accessory = await prisma.accessory.findUnique({ where: { id } });
        if (!accessory) continue;

        orderItems.push({
          productId: null,
          accessoryId: accessory.id,
          quantity: item.quantity,
          price: item.price, // ✅ use price from frontend/cart
        });
      }
    }

    if (!orderItems.length) {
      return res.status(400).json({ error: 'No valid items found in DB.' });
    }

   

    const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    console.log(totalAmount)

    const savedOrder = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        status: 'PENDING',
        items: {
          create: orderItems,
        },
      },
      include: { items: true },
    });

    await prisma.cart.deleteMany({ where: { userId } });

    const html = `
      <h2>🧾 New Order Received</h2>
      <p><strong>Name:</strong> ${billingDetails.firstName} ${billingDetails.lastName}</p>
      <p><strong>Address:</strong> ${billingDetails.streetAddress1}, ${billingDetails.streetAddress2}, ${billingDetails.city}, ${billingDetails.state}, ${billingDetails.pin}, ${billingDetails.country}</p>
      <p><strong>Email:</strong> ${billingDetails.email}</p>
      <p><strong>Phone:</strong> ${billingDetails.phone || 'N/A'}</p>
      <p><strong>Notes:</strong> ${billingDetails.notes || 'None'}</p>
      <hr/>
      <h3>🛒 Items:</h3>
      <ul>
        ${cartItems
          .map(
            (item) =>
              `<li>${item.name} × ${item.quantity} — ₹${(item.price * item.quantity).toFixed(2)}</li>`
          )
          .join('')}
      </ul>
      <p><strong>Total:</strong> ₹${total}</p>
      <p><strong>Coupon:</strong> ${coupon || 'None'}</p>
    `;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'furqanshaikh939@gmail.com',
        pass: 'smdj irys luou kzve', // App password
      },
    });

    await transporter.sendMail({
      from: 'furqanshaikh939@gmail.com',
      to,
      subject: '🧾 New Order Received',
      html,
    });

    return res.status(200).json({
      success: true,
      message: '✅ Order placed and email sent successfully',
      data: savedOrder,
    });
  } catch (error) {
    console.error('❌ Order/email error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});



router.get('/', verifyToken, async (req, res) => {
  try {
    // 🧠 Fetch the current user
    const user = await prisma.user.findUnique({ where: { id: req.userId } });

    // 🔐 Safety checks
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    const isSuperAdmin = user.role === 'SUPER_ADMIN';
    console.log('Logged in user ID:', user.id);
    console.log('User Role:', user.role);
    console.log('Is Super Admin:', isSuperAdmin);

    // 🔍 Fetch orders based on role
    const orders = await prisma.order.findMany({
      where: isSuperAdmin ? {} : { userId: user.id }, // 🔐 Secure filter
      include: {
        items: {
          include: {
            product: true,
            accessory: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 🧾 Debug print (optional, remove in prod)
    console.log(`Fetched ${orders.length} order(s) for ${user.role}`);

    res.status(200).json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error('❌ Error fetching orders:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Update order status (super admin only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    res.status(200).json({ success: true, order: updatedOrder });
  } catch (err) {
    console.error('❌ Error updating order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ✅ Delete order (super admin only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.orderItem.deleteMany({ where: { orderId: req.params.id } });
    await prisma.order.delete({ where: { id: req.params.id } });

    res.status(200).json({ success: true, message: 'Order deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting order:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});




module.exports = router;
