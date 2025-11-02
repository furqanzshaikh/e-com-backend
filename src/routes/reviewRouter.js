const express = require("express");
const router = express.Router();
const verifySuperAdmin = require("../middleware/verifySuperAdmin");
const {
  getAllReviews,
  getReviewById,
  createReview,
  updateReview,
  deleteReview,
} = require("../controllers/reviewController");

// ✅ Get all reviews (or filter by productId)
router.get("/review", getAllReviews);

// ✅ Get single review by ID
router.get("/review/:id", getReviewById);

// ✅ Create a new review (restricted to SuperAdmin)
router.post("/review", createReview);

// ✅ Update review (restricted to SuperAdmin)
router.put("/review/:id", verifySuperAdmin, updateReview);

// ✅ Delete review (restricted to SuperAdmin)
router.delete("/review/:id", verifySuperAdmin, deleteReview);

module.exports = router;
