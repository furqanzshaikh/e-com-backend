const express = require("express");
const router = express.Router();
const {
  createCategories,
  getAllCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const verifySuperAdmin = require("../middleware/verifySuperAdmin");

// Routes
router.get("/category", getAllCategory);
router.get("/category/:id", getCategoryById);
router.post("/category", verifySuperAdmin,createCategories);
router.put("/category/:id",verifySuperAdmin, updateCategory);
router.delete("/category/:id",verifySuperAdmin, deleteCategory);

module.exports = router;
