require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { PrismaClient } = require('./generated/prisma');

const userRouter = require('./src/routes/userRouter');
const productRouter = require('./src/routes/productRouter');
const buildRouter = require('./src/routes/customBuildRoutes');
const partsRouter = require('./src/routes/partRoutes');
const paymentRouter = require('./src/routes/paymentRouter'); // Cashfree router
const orderRouter = require('./src/controllers/orderController'); // rename controller to router
const searchController = require('./src/controllers/searchController');
const authRouter = require('./src/routes/authRouter');
const categoryRouter = require('./src/routes/categoryRouter');
const reviewRouter = require('./src/routes/reviewRouter')
const couponRouter = require('./src/routes/couponRouter')
const saleRouter = require('./src/routes/saleRouter')
const accessoryReviewRouter = require('./src/routes/accessoryReviewRouter')
const customBuildMail = require('./src/routes/customBuildEmailRouter')


let prisma;
if (!global.prisma) {
  global.prisma = new PrismaClient();
}
prisma = global.prisma;

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  'https://e-com-three-indol.vercel.app',
  'https://www.maxtechindia.in',
  'http://localhost:3000',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies or Authorization headers
};

app.use(cors(corsOptions));

app.use(cookieParser());
app.use(express.json()); 

// --- Routes ---
app.use('/payment/cashfree', paymentRouter);
app.use('/users', userRouter);
app.use('/products', productRouter);
app.use(authRouter);
app.use('/order', orderRouter);
app.use('/parts', partsRouter);
app.use('/custom-build', buildRouter);
app.use('/search', searchController);
app.use(categoryRouter)
app.use(reviewRouter)
app.use('/coupon',couponRouter)
app.use('/sale',saleRouter)
app.use('/accessory',accessoryReviewRouter)
app.use('/',customBuildMail)




// --- Root route ---
app.get('/', (req, res) => {
  res.json({ status: 'API running', version: '1.0' });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack || err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --- Start server ---
app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log(`Server running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('Prisma connection error:', err);
  }
});
