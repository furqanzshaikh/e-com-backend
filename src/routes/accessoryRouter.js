const express = require('express');
const router = express.Router();
const {
  createAccessory,
  getAllAccessories,
  getAccessoryById,
  updateAccessory,
  deleteAccessory
} = require('../controllers/accessoryController');

// CREATE
router.post('/create', createAccessory);

// READ ALL
router.get('/get', getAllAccessories);

// READ ONE
router.get('/get/:id', getAccessoryById);

// UPDATE
router.put('/update/:id', updateAccessory);

// DELETE
router.delete('/delete/:id', deleteAccessory);

module.exports = router;
