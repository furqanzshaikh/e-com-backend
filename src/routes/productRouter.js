const { Router } = require('express');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const router = Router();

router.get('/all', getAllProducts);
router.get('/:id', getProductById);
router.post('/create', createProduct);
router.patch('/update/:id', updateProduct);
router.delete('/delete/:id', deleteProduct);

module.exports = router;
