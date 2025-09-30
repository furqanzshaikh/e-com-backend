const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

/**
 * Helper to check if user is SUPER_ADMIN
 */
const isSuperAdmin = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  return user?.role === 'SUPER_ADMIN';
};

/**
 * Create a new part (SUPER_ADMIN only)
 */

exports.createPart = async (req, res) => {
  const userId = req.userId;
  const { name, category, subcategory = '', price, stock = 0, images = [] } = req.body;

  try {
    if (!(await isSuperAdmin(userId))) {
      return res
        .status(403)
        .json({ error: "Forbidden: Only SUPER_ADMIN can create parts" });
    }

    const newPart = await prisma.part.create({
      data: {
        name,
        category,
        subcategory,
        price,
        stock,
        userId,
        images: {
          create: images.map((img) => ({
            url: img.url,
            alt: img.alt || "",
          })),
        },
      },
      include: { images: true }, // return with images
    });

    res.status(201).json(newPart);
  } catch (error) {
    console.error("❌ Error creating part:", error);
    res.status(500).json({ error: "Server error" });
  }
};


/**
 * Get all parts (open/public or for all roles)
 */

exports.getAllParts = async (req, res) => {
  try {
    const { category, brand } = req.query;

    const parts = await prisma.part.findMany({
      where: {
        category: category || undefined,
        brand: brand || undefined,
      },
      include: { images: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(parts);
  } catch (error) {
    console.error('Error fetching parts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get part by ID (open/public)
 */

exports.getPartById = async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ Ensure `id` is valid
    const partId = parseInt(id, 10);
    if (isNaN(partId)) {
      return res.status(400).json({ error: 'Invalid part ID' });
    }

    const part = await prisma.part.findUnique({
      where: { id: partId },
      include: { images: true },
    });

    if (!part) {
      return res.status(404).json({ error: 'Part not found' });
    }

    res.status(200).json(part);
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get part by name (used for cart lookup)
exports.getPartByName = async (req, res) => {
  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ message: 'Part name is required' });
  }

  try {
    const part = await prisma.part.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive' // ✅ case-insensitive search
        }
      }
    });

    if (!part) return res.status(404).json({ message: 'Part not found' });

    res.json(part);
  } catch (error) {
    console.error('❌ Error in getPartByName:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};



/**
 * Update part by ID (SUPER_ADMIN only)
 */
exports.updatePart = async (req, res) => {
  const userId = req.userId;

  try {
    if (!(await isSuperAdmin(userId))) {
      return res.status(403).json({ error: 'Forbidden: Only SUPER_ADMIN can update parts' });
    }

    const { id } = req.params;
    const { name, category, subcategory, price, stock } = req.body;

    const updatedPart = await prisma.part.update({
      where: { id: parseInt(id) },
      data: {
        name,
        category,
        subcategory,
        price,
        stock,
      },
    });

    res.status(200).json(updatedPart);
  } catch (error) {
    console.error('❌ Error updating part:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


/**
 * Add multiple parts (SUPER_ADMIN only)
 */
exports.addMultipleParts = async (req, res) => {
  const userId = req.userId;
  const parts = req.body.parts;

  try {
    // Only SUPER_ADMIN can bulk add parts
    if (!(await isSuperAdmin(userId))) {
      return res
        .status(403)
        .json({ error: 'Forbidden: Only SUPER_ADMIN can bulk add parts' });
    }

    for (const part of parts) {
      const { name, category, subcategory = '', price, stock = 0, images = [] } = part;

      // Create the part
      const newPart = await prisma.part.create({
        data: {
          name,
          category,
          subcategory,
          price,
          stock,
          userId,
        },
      });

      // Create images if provided
      if (images.length > 0) {
        await prisma.partImage.createMany({
          data: images.map((img) => ({
            partId: newPart.id,
            url: img.url,
            alt: img.alt || '',
          })),
        });
      }
    }

    res.status(201).json({ success: true, message: '✅ Parts added successfully' });
  } catch (error) {
    console.error('❌ Error adding multiple parts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



/**
 * Delete part by ID (SUPER_ADMIN only)
 */
exports.deletePart = async (req, res) => {
  const userId = req.userId;

  try {
    if (!(await isSuperAdmin(userId))) {
      return res.status(403).json({ error: 'Forbidden: Only SUPER_ADMIN can delete parts' });
    }

    const { id } = req.params;

    await prisma.partImage.deleteMany({ where: { partId: parseInt(id) } });
    await prisma.part.delete({ where: { id: parseInt(id) } });

    res.status(200).json({ message: 'Part deleted successfully' });
  } catch (error) {
    console.error('Error deleting part:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
