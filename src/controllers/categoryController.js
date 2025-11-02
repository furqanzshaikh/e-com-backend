const { PrismaClient } = require("../../generated/prisma");
const prisma = new PrismaClient();

// 🟢 CREATE (Bulk create categories)
const createCategories = async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ message: "Categories array is required" });
    }

    const uniqueCategories = [...new Set(categories.map(c => c.trim()))];

    const existing = await prisma.category.findMany({
      where: { name: { in: uniqueCategories } },
      select: { name: true },
    });

    const existingNames = existing.map(c => c.name);
    const newCategories = uniqueCategories.filter(
      name => !existingNames.includes(name)
    );

    if (newCategories.length === 0) {
      return res.status(409).json({ message: "All categories already exist" });
    }

    const created = await prisma.category.createMany({
      data: newCategories.map(name => ({ name })),
      skipDuplicates: true,
    });

    res.status(201).json({
      message: "Categories created successfully",
      createdCount: created.count,
      skipped: existingNames,
    });
  } catch (error) {
    console.error("Error creating categories:", error);
    res.status(500).json({ message: "Failed to create categories" });
  }
};

// 🟢 READ (Get all categories)
const getAllCategory = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({

    });
    res.status(200).json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ message: "Failed to fetch categories" });
  }
};

// 🟢 READ (Get single category by ID)
const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    res.status(500).json({ message: "Failed to fetch category" });
  }
};

// 🟡 UPDATE (Update category name)
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check if new name already exists
    const existing = await prisma.category.findUnique({
      where: { name },
    });
    if (existing && existing.id !== Number(id)) {
      return res.status(409).json({ message: "Category name already exists" });
    }

    const updated = await prisma.category.update({
      where: { id: Number(id) },
      data: { name: name.trim() },
    });

    res.status(200).json({
      message: "Category updated successfully",
      category: updated,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    res.status(500).json({ message: "Failed to update category" });
  }
};

// 🔴 DELETE (Delete single category)
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id: Number(id) },
    });

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await prisma.category.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    res.status(500).json({ message: "Failed to delete category" });
  }
};

module.exports = {
  createCategories,
  getAllCategory,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
