const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

// Get all products with images
const getAllProducts = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { images: true }
    });
    res.status(200).json({ message: "success", data: products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
};

// Get single product by ID with images
const getProductById = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: { images: true }
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.status(200).json({ message: "success", data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

// Create a new product with images
const createProduct = async (req, res) => {
  const { name, description, actualPrice, sellingPrice, category, stock, images } = req.body;

  if (!name || !actualPrice || !sellingPrice || !category) {
    return res.status(400).json({ error: "Name, actualPrice, sellingPrice and category are required" });
  }

  try {
    const newProduct = await prisma.product.create({
      data: {
        name,
        description,
        actualPrice,
        sellingPrice,
        category,
        stock: stock || 0,
        images: {
          create: images || [], // images is an array of objects [{ url, alt }]
        },
      },
      include: { images: true },
    });

    res.status(201).json({ message: "Product created", data: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: 'Failed to create product' });
  }
};

// Update product (including images)
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const { name, description, actualPrice, sellingPrice, category, stock, images } = req.body;

  try {
    // Update product fields
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        actualPrice,
        sellingPrice,
        category,
        stock,
      },
    });

    // Optional: Update images (for simplicity, delete old images and add new ones)
    if (images) {
      // Delete existing images for this product
      await prisma.productImage.deleteMany({ where: { productId: updatedProduct.id } });

      // Add new images
      if (images.length > 0) {
        const imagesToCreate = images.map(img => ({
          productId: updatedProduct.id,
          url: img.url,
          alt: img.alt || null,
        }));
        await prisma.productImage.createMany({ data: imagesToCreate });
      }
    }

    // Fetch updated product with images
    const productWithImages = await prisma.product.findUnique({
      where: { id: parseInt(id) },
      include: { images: true },
    });

    res.status(200).json({ message: "Product updated", data: productWithImages });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ error: 'Failed to update product' });
  }
};

// Delete product and its images
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    // Delete images first due to FK constraints
    await prisma.productImage.deleteMany({ where: { productId: parseInt(id) } });

    // Delete product
    await prisma.product.delete({ where: { id: parseInt(id) } });

    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
