const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

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
  const parsedId = parseInt(id);

  if (isNaN(parsedId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: parsedId },
      include: { images: true },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.status(200).json({ message: "success", data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};



// Create a new product with images
const createProduct = async (req, res) => {
  const { name, description, actualPrice, sellingPrice, category, stock, images, boxpack, categories } = req.body;

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
        categories: categories || [],
        stock: stock || 0,
        images: {
          create: images || [],
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
  const { name, description, actualPrice, sellingPrice, category, stock, images, boxpack, categories } = req.body;

  try {
    const updatedProduct = await prisma.product.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        actualPrice,
        sellingPrice,
        category,
        boxpack,
        categories,
        stock,
      },
    });

    // Optional: Update images
    if (images) {
      await prisma.productImage.deleteMany({ where: { productId: updatedProduct.id } });

      if (images.length > 0) {
        const imagesToCreate = images.map(img => ({
          productId: updatedProduct.id,
          url: img.url,
          alt: img.alt || null,
        }));
        await prisma.productImage.createMany({ data: imagesToCreate });
      }
    }

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
    await prisma.productImage.deleteMany({ where: { productId: parseInt(id) } });
    await prisma.product.delete({ where: { id: parseInt(id) } });

    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
};

// Create multiple products with images
const createMultipleProducts = async (req, res) => {
  const products = req.body;

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
        stock,
        images
      } = product;

      if (!name || !actualPrice || !sellingPrice || !category) {
        continue; // Skip invalid product
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


const createAccessory = async (req, res) => {
  try {
    const {
      name,
      description,
      actualPrice,
      sellingPrice,
      brand,
      compatibility,
      boxpack,
      stock,
      images = [],
    } = req.body;

    // Validate required fields
    if (!name || !actualPrice || !sellingPrice || !stock) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, actualPrice, sellingPrice, stock',
      });
    }

    // Create accessory with images
    const accessory = await prisma.accessory.create({
      data: {
        name,
        description,
        actualPrice,
        sellingPrice,
        brand,
        compatibility,
        boxpack,
        stock,
        images: {
          create: images.map((img) => ({
            url: img.url,
            alt: img.alt || name,
          })),
        },
      },
      include: { images: true },
    });

    res.status(201).json({ success: true, data: accessory });
  } catch (error) {
    console.error('Accessory creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create accessory',
      error: error.message || error,
    });
  }
};

// READ All Accessories
const getAllAccessories = async (req, res) => {
  try {
    const accessories = await prisma.accessory.findMany({
      include: {
        images: true,
      },
      orderBy: {
        createdAt: 'desc', // Optional: shows latest first
      },
    });

    res.status(200).json({
      success: true,
      message: 'Accessories fetched successfully',
      data: accessories,
    });
  } catch (error) {
    console.error("❌ Error fetching accessories:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accessories',
      error: error.message,
    });
  }
};


// READ Accessory by ID
const getAccessoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // Convert id to number if it's coming as string
    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, message: 'Invalid accessory ID' });
    }

    const accessory = await prisma.accessory.findUnique({
      where: { id: numericId },
      include: { images: true },
    });

    if (!accessory) {
      return res.status(404).json({ success: false, message: 'Accessory not found' });
    }

    res.status(200).json({ success: true, data: accessory });
  } catch (error) {
    console.error('❌ Error fetching accessory by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch accessory',
      error: error.message,
    });
  }
};


// UPDATE Accessory
const updateAccessory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      name,
      description,
      actualPrice,
      sellingPrice,
      brand,
      compatibility,
      boxpack,
      stock,
    } = req.body;

    const accessory = await prisma.accessory.update({
      where: { id },
      data: {
        name,
        description,
        actualPrice,
        sellingPrice,
        brand,
        compatibility,
        boxpack,
        stock,
        updatedAt: new Date(),
      },
      include: { images: true },
    });

    res.json({ success: true, data: accessory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update accessory' });
  }
};

// DELETE Accessory
const deleteAccessory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Delete related images first
    await prisma.accessoryImage.deleteMany({ where: { accessoryId: id } });

    // Then delete the accessory
    await prisma.accessory.delete({ where: { id } });

    res.json({ success: true, message: 'Accessory deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete accessory' });
  }
};

// Add to cart
const handleAddToCart = async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

  try {
    // 🔐 Token validation
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    let payload;

    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(403).json({ message: 'Invalid or expired token', error: err.message });
    }

    const userId = payload.userId || payload.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing from token' });
    }

    // 📥 Extract body fields
    const { sellingPrice, productId, accessoryId, quantity = 1 } = req.body;

    // 🧾 Validation
    if (!sellingPrice || (!productId && !accessoryId)) {
      return res.status(400).json({ message: 'Required fields missing: sellingPrice and either productId or accessoryId' });
    }

    if (productId && accessoryId) {
      return res.status(400).json({ message: 'Provide only one: productId or accessoryId — not both' });
    }

    let existingCartItem = null;
    let itemType = '';
    let itemExists = false;

    // 🧩 Handle Product
    if (productId) {
      const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
      if (!product) return res.status(404).json({ message: 'Product not found' });

      itemType = 'product';
      itemExists = true;
      existingCartItem = await prisma.cart.findFirst({
        where: { userId, productId: Number(productId) }
      });
    }

    // 🧩 Handle Accessory
    if (accessoryId) {
      const accessory = await prisma.accessory.findUnique({ where: { id: Number(accessoryId) } });
      if (!accessory) return res.status(404).json({ message: 'Accessory not found' });

      itemType = 'accessory';
      itemExists = true;
      existingCartItem = await prisma.cart.findFirst({
        where: { userId, accessoryId: Number(accessoryId) }
      });
    }

    // 🔁 Update if item already in cart
    if (existingCartItem) {
      const updated = await prisma.cart.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: existingCartItem.quantity + Number(quantity),
          priceAtAdd: sellingPrice,
        }
      });

      return res.status(200).json({ message: `${itemType} quantity updated in cart`, data: updated });
    }

    // ➕ Add new item to cart
    const cartItem = await prisma.cart.create({
      data: {
        userId,
        productId: productId ? Number(productId) : null,
        accessoryId: accessoryId ? Number(accessoryId) : null,
        quantity: Number(quantity),
        priceAtAdd: sellingPrice
      }
    });

    return res.status(201).json({ message: `${itemType} added to cart`, data: cartItem });

  } catch (error) {
    console.error('Add to cart error:', error);
    return res.status(500).json({ message: 'Something went wrong', error: error.message || error });
  }
};

// Get cart items for logged-in user
const getProductFromCart = async (req, res) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: User ID missing' });
    }

    const cartItems = await prisma.cart.findMany({
      where: { userId },
      include: {
        product: {
          include: { images: true },
        },
        accessory: {
          include: { images: true },
        },
      },
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

// Delete from cart
const deleteFromCart = async (req, res) => {
  const { cartItemId } = req.params;
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


const deleteAllFromCart = async (req, res) => {
  try {
    console.log('🔍 req', {
      userId: req.userId,
      headers: req.headers,
      cookies: req.cookies,
      params: req.params,
      body: req.body
    });

    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized. No user ID found in request.' });
    }

    // Delete all cart items for the user
    await prisma.cart.deleteMany({
      where: {
        userId: userId,
      },
    });

    res.status(200).json({ message: 'Cart cleared successfully.' });

  } catch (error) {
    console.error('❌ Error clearing cart:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


// Update cart item
const updateCart = async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized: Token missing or malformed' });
    }

    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, JWT_SECRET);
    const userId = payload.userId || payload.id;

    const { cartItemId } = req.params;
    const { quantity, priceAtAdd } = req.body;

    if (!cartItemId) {
      return res.status(400).json({ message: 'Missing cart item ID' });
    }

    const existing = await prisma.cart.findUnique({
      where: { id: parseInt(cartItemId) },
    });

    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ message: 'Cart item not found or not authorized' });
    }

    const updated = await prisma.cart.update({
      where: { id: parseInt(cartItemId) },
      data: {
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(priceAtAdd !== undefined && { priceAtAdd }),
      },
    });

    return res.status(200).json({ message: 'Cart item updated', data: updated });

  } catch (error) {
    console.error('Update cart error:', error);
    return res.status(500).json({ message: 'Something went wrong', error: error.message || error });
  }
};

module.exports = {
  updateCart,
  deleteFromCart,
  getProductFromCart,
  handleAddToCart,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createMultipleProducts,
deleteAllFromCart,

  createAccessory,
  getAllAccessories,
  getAccessoryById,
  updateAccessory,
  deleteAccessory,
};

