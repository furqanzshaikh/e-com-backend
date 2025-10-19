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
const { default: handler } = require('./src/routes/paymentRouter');

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

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (!allowedOrigins.includes(origin)) {
      return callback(new Error('The CORS policy does not allow access from the specified Origin.'), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

app.use(cookieParser());
app.use(express.json()); 

// --- Routes ---
app.use('/payment/cashfree', handler);
app.use('/users', userRouter);
app.use('/products', productRouter);
app.use(authRouter);
app.use('/order', orderRouter);
app.use('/parts', partsRouter);
app.use('/custom-build', buildRouter);
app.use('/search', searchController);



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
