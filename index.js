const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('./generated/prisma');
const userRouter = require('./src/routes/userRouter');
const productRouter = require('./src/routes/productRouter');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Register user routes
app.use('/users',userRouter);
app.use('/products',productRouter)


// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
