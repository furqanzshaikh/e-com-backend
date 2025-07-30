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
  const { name, type, price } = req.body;

  try {
    if (!(await isSuperAdmin(userId))) {
      return res.status(403).json({ error: 'Forbidden: Only SUPER_ADMIN can create parts' });
    }

    const newPart = await prisma.part.create({
      data: { name, type, price, userId },
    });

    res.status(201).json(newPart);
  } catch (error) {
    console.error('❌ Error creating part:', error);
    res.status(500).json({ error: 'Server error' });
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

    const part = await prisma.part.findUnique({
      where: { id: parseInt(id) },
      include: { images: true },
    });

    if (!part) return res.status(404).json({ error: 'Part not found' });

    res.status(200).json(part);
  } catch (error) {
    console.error('Error fetching part:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    const {
      name,
      category,
      brand,
      description,
      actualPrice,
      sellingPrice,
      compatibility,
      stock,
      boxpack,
    } = req.body;

    const updatedPart = await prisma.part.update({
      where: { id: parseInt(id) },
      data: {
        name,
        category,
        brand,
        description,
        actualPrice,
        sellingPrice,
        compatibility,
        stock,
        boxpack,
      },
    });

    res.status(200).json(updatedPart);
  } catch (error) {
    console.error('Error updating part:', error);
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
    if (!(await isSuperAdmin(userId))) {
      return res.status(403).json({ error: 'Forbidden: Only SUPER_ADMIN can bulk add parts' });
    }

    for (const part of parts) {
      const { name, type, category, price, stock, images = [] } = part;

      const newPart = await prisma.part.create({
        data: {
          name,
          type,
          category,
          price,
          stock,
          userId,
        },
      });

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
