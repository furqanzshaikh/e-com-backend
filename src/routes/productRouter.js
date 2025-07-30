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
  updateCart,
  createAccessory,
  getAllAccessories,
  getAccessoryById,
  updateAccessory,
  deleteAccessory,
  deleteAllFromCart,
} = require('../controllers/productController');

const { placeOrder } = require('../controllers/orderController');
const verifyToken = require('../middleware/authMiddleware');
const verifyAdminOrSuperAdmin = require('../middleware/verifyAdminOrSuperAdmin');

const router = Router();

// ✅ Public Product Routes
router.get('/all', getAllProducts);

// ✅ Public Accessory Routes
router.get('/accessories', getAllAccessories);
router.get('/accessories/:id', getAccessoryById);

// ✅ Admin/SuperAdmin Accessory Routes
router.post('/accessories/create', verifyAdminOrSuperAdmin, createAccessory);
router.patch('/accessories/update/:id', verifyAdminOrSuperAdmin, updateAccessory);
router.delete('/accessories/delete/:id', verifyAdminOrSuperAdmin, deleteAccessory);

// ✅ Admin/SuperAdmin Product Routes
router.post('/create', verifyAdminOrSuperAdmin, createProduct);
router.post('/createmany', verifyAdminOrSuperAdmin, createMultipleProducts);
router.patch('/update/:id', verifyAdminOrSuperAdmin, updateProduct);
router.delete('/delete/:id', verifyAdminOrSuperAdmin, deleteProduct);

// ✅ Cart Routes (Require Login)
router.post('/cart/add', verifyToken, handleAddToCart);
router.get('/cart/get', verifyToken, getProductFromCart);
router.delete('/cart/all', verifyToken, deleteAllFromCart);
router.delete('/cart/delete/:cartItemId', verifyToken, deleteFromCart);
router.patch('/cart/update/:cartItemId', verifyToken, updateCart);

// ✅ Place Order
// router.post('/order', verifyToken, placeOrder);

// ✅ Get Single Product (keep at bottom to avoid route conflicts)
router.get('/:id', getProductById);

module.exports = router;
