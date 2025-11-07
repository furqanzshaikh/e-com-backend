const express = require('express');
const router = express.Router();
const {
  getAllAccessoryReviews,
  getAccessoryReviewById,
  createAccessoryReview,
  updateAccessoryReview,
  deleteAccessoryReview,
} = require('../controllers/accessoryReviewController');
const verifySuperAdmin = require('../middleware/verifySuperAdmin');

// CRUD routes
router.get('/', getAllAccessoryReviews);
router.get('/:id', getAccessoryReviewById);
router.post('/', createAccessoryReview);
router.put('/:id',verifySuperAdmin, updateAccessoryReview);
router.delete('/:id',verifySuperAdmin, deleteAccessoryReview);

module.exports = router;
