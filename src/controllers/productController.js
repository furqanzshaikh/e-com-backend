const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const redis = require('../redisClient')

const getAllProducts = async (req, res) => {
  try {
    const cacheKey = "all_products";

    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log("🧠 Cache hit (all products)");
      return res.json({
        message: "success (from cache)",
        data: JSON.parse(cached),
      });
    }

    console.log("🚀 Cache miss — fetching from DB...");
    const products = await prisma.product.findMany({
      include: {
        images: true,
        categories: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    await redis.set(cacheKey, JSON.stringify(products), "EX", 3600);

    res.json({ message: "success", data: products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};

// 🔹 GET PRODUCT BY ID (with individual cache)
const getProductById = async (req, res) => {
  const { id } = req.params;
  const parsedId = parseInt(id);

  if (isNaN(parsedId)) {
    return res.status(400).json({ error: "Invalid product ID" });
  }

  try {
    const cacheKey = `product_${parsedId}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`🧠 Cache hit (product ${parsedId})`);
      return res.json({
        message: "success (from cache)",
        data: JSON.parse(cached),
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: parsedId },
      include: {
        images: true,
        categories: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    await redis.set(cacheKey, JSON.stringify(product), "EX", 3600);

    res.status(200).json({ message: "success", data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};

// 🔹 CREATE PRODUCT (invalidate cache)
const createProduct = async (req, res) => {
  const {
    name,
    description,
    actualPrice,
    sellingPrice,
    category,
    stock,
    brand,
    images = [],
    boxpack,
  } = req.body;

  if (
    !name ||
    typeof actualPrice !== "number" ||
    typeof sellingPrice !== "number" ||
    !Array.isArray(category) ||
    category.length === 0
  ) {
    return res.status(400).json({
      error:
        "Required fields: name, actualPrice (number), sellingPrice (number), and category (non-empty array)",
    });
  }

  try {
    const finalName = boxpack === false ? `${name} (Unboxed)` : name;

    const newProduct = await prisma.product.create({
      data: {
        name: finalName,
        description,
        actualPrice,
        sellingPrice,
        brand,
        boxpack: boxpack ?? false,
        stock: stock ?? 0,
        categories: {
          connectOrCreate: category.map((catName) => ({
            where: { name: catName },
            create: { name: catName },
          })),
        },
        images: {
          create: images.map((img) => ({
            url: img.url,
            alt: img.alt || finalName,
          })),
        },
      },
      include: {
        images: true,
        categories: true,
      },
    });

    // ❌ Invalidate all product cache
    await redis.del("all_products");
    console.log("🧹 Cache cleared: all_products");

    res
      .status(201)
      .json({ message: "Product created successfully", data: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res
      .status(500)
      .json({ error: "Failed to create product", details: error.message });
  }
};

// 🔹 UPDATE PRODUCT (update cache + invalidate)
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    actualPrice,
    sellingPrice,
    category,
    stock,
    images = [],
    boxpack,
    brand,
  } = req.body;

  try {
    const productId = parseInt(id);
    if (isNaN(productId)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    let finalName = name;
    if (boxpack === false) {
      if (!finalName.includes("(Unboxed)")) {
        finalName = `${finalName} (Unboxed)`;
      }
    } else if (boxpack === true) {
      finalName = finalName.replace(/\s*\(Unboxed\)$/, "");
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: finalName,
        description,
        actualPrice,
        sellingPrice,
        brand,
        boxpack,
        stock,
        categories: {
          set: [],
          connectOrCreate:
            category?.map((catName) => ({
              where: { name: catName },
              create: { name: catName },
            })) || [],
        },
      },
    });

    await prisma.productImage.deleteMany({ where: { productId } });

    if (images.length > 0) {
      const imagesToCreate = images.map((img) => ({
        productId,
        url: img.url,
        alt: img.alt || finalName,
      }));
      await prisma.productImage.createMany({ data: imagesToCreate });
    }

    const productWithDetails = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, categories: true },
    });

    // ❌ Invalidate both single and all cache
    await redis.del(`product_${productId}`);
    await redis.del("all_products");
    console.log(`🧹 Cache cleared: product_${productId}, all_products`);

    res
      .status(200)
      .json({ message: "Product updated successfully", data: productWithDetails });
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(500)
      .json({ error: "Failed to update product", details: error.message });
  }
};

// 🔹 DELETE PRODUCT (invalidate cache)
const deleteProduct = async (req, res) => {
  const { id } = req.params;
  try {
    const productId = parseInt(id);

    await prisma.productImage.deleteMany({ where: { productId } });
    await prisma.product.delete({ where: { id: productId } });

    // ❌ Invalidate related caches
    await redis.del(`product_${productId}`);
    await redis.del("all_products");
    console.log(`🧹 Cache cleared: product_${productId}, all_products`);

    res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Failed to delete product" });
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
        brand, // ✅ Required field
        category, // ✅ Array of category names
        boxpack,
        stock,
        images = [],
      } = product;

      // Validate required fields
      if (
        !name ||
        !actualPrice ||
        !sellingPrice ||
        !brand ||
        !Array.isArray(category) ||
        category.length === 0
      ) {
        console.warn("⚠️ Skipping invalid product:", product);
        continue;
      }

      // Create product
      const newProduct = await prisma.product.create({
        data: {
          name,
          description,
          actualPrice,
          sellingPrice,
          brand,
          boxpack,
          stock: stock || 0,
          categories: {
            connectOrCreate: category.map((catName) => ({
              where: { name: catName },
              create: { name: catName },
            })),
          },
          images: {
            create: images.map((img) => ({
              url: img.url,
              alt: img.alt || name,
            })),
          },
        },
        include: {
          images: true,
          categories: true,
        },
      });

      createdProducts.push(newProduct);
    }

    res.status(201).json({ message: "Products created successfully", data: createdProducts });
  } catch (error) {
    console.error("❌ Error creating products:", error);
    res.status(500).json({ error: 'Failed to create products', details: error.message });
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
      categories = [] // this should be an array of strings
    } = req.body;

    if (!name || !actualPrice || !sellingPrice || !stock) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, actualPrice, sellingPrice, stock',
      });
    }

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
        categories: {
          connectOrCreate: categories.map((cat) => ({
            where: { name: cat },
            create: { name: cat }
          })),
        },
      },
      include: {
        images: true,
        categories: true
      },
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


const createManyAccessories = async (req, res) => {
  try {
    const accessories = req.body;

    if (!Array.isArray(accessories) || accessories.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must be a non-empty array of accessories',
      });
    }

    const createdAccessories = [];

    for (const item of accessories) {
      const {
        name,
        description,
        actualPrice,
        sellingPrice,
        brand,
        compatibility,
        boxpack,
        stock,
        categories = [], // should be an array of category names
        images = [],
      } = item;

      // Validate required fields
      if (!name || !actualPrice || !sellingPrice || !stock || categories.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            'Missing required fields in one of the accessories: name, actualPrice, sellingPrice, stock, categories[]',
        });
      }

      const newAccessory = await prisma.accessory.create({
        data: {
          name,
          description,
          actualPrice,
          sellingPrice,
          brand,
          compatibility,
          boxpack,
          stock,
          categories: {
            connectOrCreate: categories.map((cat) => ({
              where: { name: cat },
              create: { name: cat },
            })),
          },
          images: {
            create: images.map((img) => ({
              url: img.url,
              alt: img.alt || name,
            })),
          },
        },
        include: { images: true, categories: true },
      });

      createdAccessories.push(newAccessory);
    }

    res.status(201).json({
      success: true,
      message: 'Accessories created successfully',
      data: createdAccessories,
    });
  } catch (error) {
    console.error('Bulk accessory creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create accessories',
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
        categories: true, // ✅ Include categories in response
      },
      orderBy: {
        createdAt: 'desc',
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

    const numericId = parseInt(id, 10);
    if (isNaN(numericId)) {
      return res.status(400).json({ success: false, message: 'Invalid accessory ID' });
    }

    const accessory = await prisma.accessory.findUnique({
      where: { id: numericId },
      include: {
        images: true,
        categories: true, // ✅ Include categories in the result
      },
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
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: "Invalid accessory ID" });
    }

    const {
      name,
      description,
      actualPrice,
      sellingPrice,
      brand,
      compatibility,
      boxpack,
      stock,
      images = [],      // Expecting array of { url, alt }
      categoryIds = []  // ✅ Expecting array of category IDs
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

        // ✅ Update categories by IDs
        categories: {
          set: categoryIds.map((catId) => ({ id: catId })),
        },

        // ✅ Update images (simple approach: clear & re-set)
        images: {
          deleteMany: {}, // remove existing images
          create: images.map((img) => ({
            url: img.url,
            alt: img.alt,
          })),
        },
      },
      include: {
        images: true,
        categories: true,
      },
    });

    res.json({ success: true, data: accessory });
  } catch (error) {
    console.error("❌ Error updating accessory:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to update accessory",
        error: error.message,
      });
  }
};



// DELETE Accessory
const deleteAccessory = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'Invalid accessory ID' });
    }

    // Disconnect categories from accessory (many-to-many relation)
    await prisma.accessory.update({
      where: { id },
      data: {
        categories: {
          set: [] // Removes all category relations
        }
      }
    });

    // Delete related images
    await prisma.accessoryImage.deleteMany({ where: { accessoryId: id } });

    // Delete the accessory itself
    await prisma.accessory.delete({ where: { id } });

    res.json({ success: true, message: 'Accessory deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting accessory:', error);
    res.status(500).json({ success: false, message: 'Failed to delete accessory', error: error.message });
  }
};

// Add to cart
const handleAddToPart = async (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_here';

  try {
    // Token validation
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

    // Accept an array of items to add
    const items = req.body; // expecting array of { partId, quantity }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Request body must be a non-empty array' });
    }

    const addedItems = [];

    for (const item of items) {
      const { productId, accessoryId, partId, quantity = 1 } = item;

      const selectedIds = [productId, accessoryId, partId].filter(Boolean);
      if (selectedIds.length !== 1) {
        return res.status(400).json({ message: 'Each item must have exactly one of: productId, accessoryId, or partId' });
      }

      let itemType = '';
      let itemId = null;
      let finalPrice = 0;
      let existingCartItem = null;

      if (productId) {
        const product = await prisma.product.findUnique({ where: { id: Number(productId) } });
        if (!product) return res.status(404).json({ message: `Product not found: ${productId}` });

        itemType = 'product';
        itemId = Number(productId);
        finalPrice = product.price;
        existingCartItem = await prisma.cart.findFirst({ where: { userId, productId: itemId } });
      }

      if (accessoryId) {
        const accessory = await prisma.accessory.findUnique({ where: { id: Number(accessoryId) } });
        if (!accessory) return res.status(404).json({ message: `Accessory not found: ${accessoryId}` });

        itemType = 'accessory';
        itemId = Number(accessoryId);
        finalPrice = accessory.price;
        existingCartItem = await prisma.cart.findFirst({ where: { userId, accessoryId: itemId } });
      }

      if (partId) {
        const part = await prisma.part.findUnique({ where: { id: Number(partId) } });
        if (!part) return res.status(404).json({ message: `Part not found: ${partId}` });

        itemType = 'part';
        itemId = Number(partId);
        finalPrice = part.price;
        existingCartItem = await prisma.cart.findFirst({ where: { userId, partId: itemId } });
      }

      if (existingCartItem) {
        const updated = await prisma.cart.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: existingCartItem.quantity + Number(quantity),
            priceAtAdd: finalPrice,
          },
        });
        addedItems.push({ message: `${itemType} quantity updated in cart`, data: updated });
      } else {
        const cartItem = await prisma.cart.create({
          data: {
            userId,
            productId: productId ? itemId : null,
            accessoryId: accessoryId ? itemId : null,
            partId: partId ? itemId : null,
            quantity: Number(quantity),
            priceAtAdd: finalPrice,
          },
        });
        addedItems.push({ message: `${itemType} added to cart`, data: cartItem });
      }
    }

    return res.status(201).json({ message: 'Items processed', items: addedItems });
  } catch (error) {
    console.error('Add to cart error:', error);
    return res.status(500).json({ message: 'Something went wrong', error: error.message || error });
  }
};




const addToCart = async (req, res) => {
  try {
    const userId = req.userId;
    const rawItems = req.body;
    const items = Array.isArray(rawItems) ? rawItems : [rawItems]; // normalize input

    if (!Array.isArray(items) || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Request body must be a non-empty array or object" });
    }

    const addedItems = [];

    for (const item of items) {
      const { productId, accessoryId, partId, quantity, sellingPrice } = item;

      if (!productId && !accessoryId && !partId) {
        return res.status(400).json({
          message:
            "Each item must have either productId, accessoryId, or partId",
        });
      }

      if (!quantity || quantity < 1 || typeof sellingPrice !== "number") {
        return res.status(400).json({
          message: "Each item must have a valid quantity and sellingPrice",
        });
      }

      // 🧩 Determine item type
      let model;
      let itemId;
      let modelName;
      if (productId) {
        model = prisma.product;
        itemId = productId;
        modelName = "product";
      } else if (accessoryId) {
        model = prisma.accessory;
        itemId = accessoryId;
        modelName = "accessory";
      } else if (partId) {
        model = prisma.part;
        itemId = partId;
        modelName = "part";
      }

      // 🛡️ Validate item exists before creating
      const exists = await model.findUnique({ where: { id: itemId } });
      if (!exists) {
        return res.status(404).json({
          message: `Item with id ${itemId} not found in ${modelName} table`,
        });
      }

      // 🔍 Check if item already exists in cart
      const existingItem = await prisma.cart.findFirst({
        where: {
          userId,
          productId: productId || undefined,
          accessoryId: accessoryId || undefined,
          partId: partId || undefined,
        },
      });

      let cartItem;

      if (existingItem) {
        // Update quantity if item exists
        cartItem = await prisma.cart.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity,
            priceAtAdd: sellingPrice, // optionally update price
          },
        });
      } else {
        // ✅ Create new cart item safely
        cartItem = await prisma.cart.create({
          data: {
            userId,
            productId: productId || null,
            accessoryId: accessoryId || null,
            partId: partId || null,
            quantity,
            priceAtAdd: sellingPrice,
          },
        });
      }

      addedItems.push(cartItem);
    }

    return res.status(200).json({
      message: "Items added to cart successfully",
      data: addedItems,
    });
  } catch (error) {
    console.error("❌ Error in addToCart:", error);
    return res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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
        part: {
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
  handleAddToPart,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  createMultipleProducts,
  deleteAllFromCart,
  addToCart,
  createAccessory,
  getAllAccessories,
  getAccessoryById,
  updateAccessory,
  deleteAccessory,
  createManyAccessories
};

