const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('./generated/prisma');
const userRouter = require('./src/routes/userRouter');
const productRouter = require('./src/routes/productRouter');
const buildRouter = require('./src/routes/customBuildRoutes');
const partsRouter = require('./src/routes/partRoutes');
const paymentRouter = require("./src/routes/paymentRouter");
const orderRoutes = require('./src/controllers/orderController');
const searchController = require('./src/controllers/searchController');
const authRouter = require('./src/routes/authRouter');
const cookieParser = require('cookie-parser');


const app = express();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ✅ Proper CORS setup for credentials
const allowedOrigins = [
  'https://e-com-three-indol.vercel.app', // frontend deployed URL
  'http://localhost:3000' // local dev
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // allow requests like Postman with no origin
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true // allow cookies/auth headers
}));
app.use(cookieParser());

app.use(express.json());

// Register routes
app.use('/users', userRouter);
app.use('/products', productRouter);
// app.use('/accessory', accessoryRouter);
app.use(authRouter);
app.use('/order', orderRoutes);
app.use('/parts', partsRouter);
app.use('/custom-build', buildRouter);
app.use('/search', searchController);

app.use("/payment", paymentRouter);

app.get('/', (req, res) => {
  res.send('Hello World');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
