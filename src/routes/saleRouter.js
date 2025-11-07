
const express = require("express");
const {
  createSale,
  getAllSales,
  getActiveSale,
  deleteSale,
} = require("../controllers/saleController");
const verifyAdminOrSuperAdmin = require("../middleware/verifyAdminOrSuperAdmin");

const router = express.Router();

// Admin
router.post("/create",verifyAdminOrSuperAdmin, createSale);
router.get("/",verifyAdminOrSuperAdmin, getAllSales);
router.delete("/:id",verifyAdminOrSuperAdmin, deleteSale);

// Public
router.get("/active", getActiveSale);

module.exports = router;
