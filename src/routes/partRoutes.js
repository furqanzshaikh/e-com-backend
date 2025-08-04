const express = require('express');
const router = express.Router();
const partController = require('../controllers/partController');
const verifyToken = require('../middleware/authMiddleware');

// ✅ Secure these routes with JWT
router.post('/', verifyToken, partController.createPart);
router.post('/bulk', verifyToken, partController.addMultipleParts);

// ⚠️ Important: place more specific routes before dynamic ones
router.get('/price', partController.getPartByName);
router.get('/all', partController.getAllParts);

// Dynamic route should come after fixed ones
router.get('/:id', partController.getPartById);
router.put('/:id', verifyToken, partController.updatePart);
router.delete('/:id', verifyToken, partController.deletePart);

module.exports = router;
