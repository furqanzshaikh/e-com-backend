const { Router } = require('express');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  createMultipleProducts,
  deleteProduct,
  handleAddToPart,
  addToCart,
  getProductFromCart,
  deleteFromCart,
  updateCart,
  createAccessory,
  getAllAccessories,
  getAccessoryById,
  updateAccessory,
  deleteAccessory,
  deleteAllFromCart,
  createManyAccessories,
  getAllCategory,
  createCategories
} = require('../controllers/productController');

const { placeOrder } = require('../controllers/orderController');
const verifyToken = require('../middleware/authMiddleware');
const verifyAdminOrSuperAdmin = require('../middleware/verifyAdminOrSuperAdmin');

const router = Router();

// ✅ Public Product Routes
// This route now supports query params for filters
router.get('/', getAllProducts); // <-- main filter route
router.get('/all', getAllProducts); // optional legacy route
router.get('/categories', getAllCategory);
router.post('/categories', verifyAdminOrSuperAdmin, createCategories);

// ✅ Public Accessory Routes
router.get('/accessories', getAllAccessories);
router.get('/accessories/:id', getAccessoryById);

// ✅ Admin/SuperAdmin Accessory Routes
router.post('/accessories/create', verifyAdminOrSuperAdmin, createAccessory);
router.post('/accessories/create/many', verifyAdminOrSuperAdmin, createManyAccessories);
router.patch('/accessories/update/:id', verifyAdminOrSuperAdmin, updateAccessory);
router.delete('/accessories/delete/:id', verifyAdminOrSuperAdmin, deleteAccessory);

// ✅ Admin/SuperAdmin Product Routes
router.post('/create', verifyAdminOrSuperAdmin, createProduct);
router.post('/create/many', verifyAdminOrSuperAdmin, createMultipleProducts);
router.patch('/update/:id', verifyAdminOrSuperAdmin, updateProduct);
router.delete('/delete/:id', verifyAdminOrSuperAdmin, deleteProduct);

// ✅ Cart Routes (Require Login)
router.post('/part/add', verifyToken, handleAddToPart);
router.post('/cart/add', verifyToken, addToCart);
router.get('/cart/get', verifyToken, getProductFromCart);
router.delete('/cart/all', verifyToken, deleteAllFromCart);
router.delete('/cart/delete/:cartItemId', verifyToken, deleteFromCart);
router.patch('/cart/update/:cartItemId', verifyToken, updateCart);

// ✅ Place Order
// router.post('/order', verifyToken, placeOrder);

// ✅ Get Single Product (keep at bottom)
router.get('/:id', getProductById);

module.exports = router;
