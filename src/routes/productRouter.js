const { Router } = require('express');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  createMultipleProducts,
  deleteProduct,
  handleAddToCart,
  getProductFromCart,
  deleteFromCart,
} = require('../controllers/productController');

const verifyToken = require('../middleware/authMiddleware');

const router = Router();

// Public Product Routes
router.get('/all', getAllProducts);
router.get('/:id', getProductById);

// Admin/Protected Product Routes (can also be wrapped with an admin middleware if needed)
router.post('/create', createProduct);
router.post('/createmany', createMultipleProducts);
router.patch('/update/:id', updateProduct);
router.delete('/delete/:id', deleteProduct);

// ✅ CART ROUTES — Require Authentication
router.post('/cart/add', verifyToken, handleAddToCart);

// ✅ Instead of using :id for getProductFromCart, get userId from token
router.get('/cart/get', verifyToken, getProductFromCart);

// ✅ Deleting item from cart (single item)
router.delete('/cart/delete/:cartItemId', verifyToken, deleteFromCart);

module.exports = router;
