const express = require('express');
const router = express.Router();
const partController = require('../controllers/partController');
const verifyToken = require('../middleware/authMiddleware');

// ✅ Secure these routes with JWT

// Create a part (maybe admin-only)
router.post('/', verifyToken, partController.createPart);

// Get all parts (can be public or protected depending on logic)
router.get('/all', partController.getAllParts);

// Get single part
router.get('/:id', partController.getPartById);

// Update a part (admin/seller only)
router.put('/:id', verifyToken, partController.updatePart);

// Delete a part (admin/seller only)
router.delete('/:id', verifyToken, partController.deletePart);

router.post('/bulk', verifyToken, partController.addMultipleParts);
module.exports = router;
