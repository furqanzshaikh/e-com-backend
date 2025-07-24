const express = require('express');
const router = express.Router();
const {
  createAccessory,
  getAllAccessories,
  getAccessoryById,
  updateAccessory,
  deleteAccessory
} = require('../controllers/accessoryController');

const verifyAdminOrSuperAdmin = require('../middleware/verifyAdminOrSuperAdmin');

// CREATE - only for Admin/Super Admin
router.post('/create', verifyAdminOrSuperAdmin, createAccessory);

// READ ALL - public
router.get('/get', getAllAccessories);

// READ ONE - public
router.get('/get/:id', getAccessoryById);

// UPDATE - optional: also restrict if needed
router.put('/update/:id', verifyAdminOrSuperAdmin, updateAccessory);

// DELETE - only for Admin/Super Admin
router.delete('/delete/:id', verifyAdminOrSuperAdmin, deleteAccessory);

module.exports = router;
