const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken')
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
  const { name, description, actualPrice, sellingPrice, category, stock, images,boxpack,sku } = req.body;

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
        boxpack,
        category,
        sku,
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
// Create multiple products with images
const createMultipleProducts = async (req, res) => {
  const products = req.body; // Expecting an array of products

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: "Request body must be a non-empty array of products" });
  }

  try {
    const createdProducts = [];

    for (const product of products) {
      const {
        name,
        description,
        actualPrice,
        sellingPrice,
        category,
        boxpack,
        categories,
        sku,
        stock,
        images
      } = product;

      if (!name || !actualPrice || !sellingPrice || !category || !sku) {
        continue; // Skip invalid products
      }

      const newProduct = await prisma.product.create({
        data: {
          name,
          description,
          actualPrice,
          sellingPrice,
          category,
          boxpack,
          categories: categories || [],
          sku,
          stock: stock || 0,
          images: {
            create: images || [],
          },
        },
        include: { images: true },
      });

      createdProducts.push(newProduct);
    }

    res.status(201).json({ message: "Products created", data: createdProducts });
  } catch (error) {
    console.error("Error creating products:", error);
    res.status(500).json({ error: 'Failed to create products' });
  }
};


const handleAddToCart = async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';
  try {
    // ✅ Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    console.log('Received token:', token);

    // ✅ Verify token
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
      console.log('Token payload:', payload);
    } catch (err) {
      console.error('JWT Error:', err.message);
      return res.status(403).json({ message: 'Invalid or expired token', error: err.message });
    }

    const userId = payload.userId || payload.id; // Depending on what your token contains
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing from token' });
    }

    // ✅ Extract data from body
    let { sellingPrice, sku, quantity = 1 } = req.body;
    quantity = Number(quantity);

    if (!sellingPrice || !sku || !quantity) {
      return res.status(400).json({ message: 'Missing required fields: sellingPrice, sku, or quantity' });
    }

    // ✅ Find product by SKU
    const product = await prisma.product.findUnique({
      where: { sku }
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found with given SKU' });
    }

    const productId = product.id;

    // ✅ Check if item already in cart
    const existing = await prisma.cart.findFirst({
      where: { userId, productId }
    });

    if (existing) {
      const updated = await prisma.cart.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + quantity,
          priceAtAdd: sellingPrice
        }
      });

      return res.status(200).json({ message: 'Cart updated', data: updated });
    }

    // ✅ Create new cart item
    const cartItem = await prisma.cart.create({
      data: {
        userId,
        productId,
        quantity,
        priceAtAdd: sellingPrice
      }
    });

    return res.status(201).json({ message: 'Item added to cart', data: cartItem });

  } catch (error) {
    console.error('Add to cart error:', error);
    return res.status(500).json({ message: 'Something went wrong', error: error.message || error });
  }
};


const getProductFromCart = async (req, res) => {
  try {
    // ✅ Use userId from the middleware
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing' });
    }

    // ✅ Fetch only this user's cart items
    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: { product: true },
    });

    return res.status(200).json({
      message: 'Cart fetched successfully',
      data: cartItems,
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({
      message: 'Failed to fetch cart',
      error: error.message || error,
    });
  }
};


const deleteFromCart = async (req, res) => {
  const { cartItemId } = req.params;
console.log(cartItemId)
  try {
    const deleted = await prisma.cart.delete({
      where: { id: Number(cartItemId) }
    });

    res.status(200).json({ message: 'Item deleted from cart', data: deleted });
  } catch (error) {
    console.error('Delete from cart error:', error);
    res.status(500).json({ message: 'Error deleting cart item', error });
  }
};


module.exports = {
  deleteFromCart,
  getProductFromCart,
  handleAddToCart,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createMultipleProducts
};
