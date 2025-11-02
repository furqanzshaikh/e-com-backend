
const express = require("express");
const {
  createCoupon,
  getCoupons,
  deleteCoupon,
  applyCoupon,
} = require("../controllers/couponController");
const verifySuperAdmin = require("../middleware/verifySuperAdmin");

const router = express.Router();

// Admin Routes
router.post("/",verifySuperAdmin ,createCoupon);   // POST /api/coupons
router.get("/",verifySuperAdmin, getCoupons);      // GET /api/coupons
router.delete("/:id",verifySuperAdmin, deleteCoupon); // DELETE /api/coupons/:id

// User Route
router.post("/apply", applyCoupon); // POST /api/coupons/apply

module.exports = router;
