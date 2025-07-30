const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('./generated/prisma');
const userRouter = require('./src/routes/userRouter');
const productRouter = require('./src/routes/productRouter');
const buildRouter = require('./src/routes/customBuildRoutes');
const partsRouter = require('./src/routes/partRoutes');
// const accessoryRouter = require('./src/routes/accessoryRouter');
const orderRoutes = require('./src/controllers/orderController');
const authRouter = require('./src/routes/authRouter');
const cookieParser = require('cookie-parser');


const app = express();

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

// ✅ Proper CORS setup for credentials
app.use(cors({
  origin: 'http://localhost:3000', // your frontend domain
  credentials: true                // ✅ must be true to allow cookies
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
app.use('/custom-builds', buildRouter);


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
