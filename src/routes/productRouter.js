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
const verifyAdminOrSuperAdmin = require('../middleware/verifyAdminOrSuperAdmin');

const router = Router();

// ✅ Public Product Routes
router.get('/all', getAllProducts);
router.get('/:id', getProductById);

// ✅ Admin/SuperAdmin Product Routes
router.post('/create', verifyAdminOrSuperAdmin, createProduct);
router.post('/createmany', verifyAdminOrSuperAdmin, createMultipleProducts);
router.patch('/update/:id', verifyAdminOrSuperAdmin, updateProduct);
router.delete('/delete/:id', verifyAdminOrSuperAdmin, deleteProduct);

// ✅ Cart Routes (Require Logged-in User)
router.post('/cart/add', verifyToken, handleAddToCart);
router.get('/cart/get', verifyToken, getProductFromCart);
router.delete('/cart/delete/:cartItemId', verifyToken, deleteFromCart);

module.exports = router;
