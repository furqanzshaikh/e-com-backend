const express = require('express');
const router = express.Router();
const { PrismaClient } = require('../../generated/prisma');

const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const searchTerm = q.trim();

    const [products, accessories] = await Promise.all([
      prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { brand: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: {
          images: true,
          categories: true,
        }
      }),

      prisma.accessory.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { brand: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: {
          images: true,
          categories: true,
        }
      }),
    ]);

    res.status(200).json({ products, accessories });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
