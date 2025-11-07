const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

// Replace with your JWT secret key
const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// -----------------------------
// Helper: Extract user from Bearer token
// -----------------------------
const getUserFromToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // should contain user info (like { id, name, email })
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
};

// -----------------------------
// Get All Accessory Reviews
// -----------------------------
const getAllAccessoryReviews = async (req, res) => {
  try {
    // ⭐ THE CRITICAL CHANGE: Use accessoryId from query to filter.
    const { accessoryId } = req.query;
    
    if (!accessoryId) {
      return res.status(400).json({ message: 'accessoryId query parameter is required' });
    }

    const where = { accessoryId: Number(accessoryId) };

    const reviews = await prisma.accessoryReview.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching accessory reviews:', error);
    res.status(500).json({ message: 'Failed to fetch accessory reviews' });
  }
};

// -----------------------------
// Get Review by ID
// -----------------------------
const getAccessoryReviewById = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await prisma.accessoryReview.findUnique({
      where: { id: Number(id) },
    });

    if (!review) {
      return res.status(404).json({ message: 'Accessory review not found' });
    }

    res.status(200).json(review);
  } catch (error) {
    console.error('Error fetching accessory review:', error);
    res.status(500).json({ message: 'Failed to fetch accessory review' });
  }
};

// -----------------------------
// Create Review (Reviewer from Token)
// -----------------------------
const createAccessoryReview = async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized or invalid token' });
    }

    const { accessoryId, rating, comment } = req.body;

    if (!accessoryId || !rating) {
      return res
        .status(400)
        .json({ message: 'accessoryId and rating are required' });
    }

    const newReview = await prisma.accessoryReview.create({
      data: {
        accessoryId: Number(accessoryId),
        rating: Number(rating),
        comment,
        reviewer: user.name || user.email || 'Anonymous',
      },
    });

    res.status(201).json({
      message: 'Accessory review created successfully',
      review: newReview,
    });
  } catch (error) {
    console.error('Error creating accessory review:', error);
    res.status(500).json({ message: 'Failed to create accessory review' });
  }
};

// -----------------------------
// Update Review
// -----------------------------
const updateAccessoryReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const existing = await prisma.accessoryReview.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Accessory review not found' });
    }

    const updatedReview = await prisma.accessoryReview.update({
      where: { id: Number(id) },
      data: { rating, comment },
    });

    res.status(200).json({
      message: 'Accessory review updated successfully',
      review: updatedReview,
    });
  } catch (error) {
    console.error('Error updating accessory review:', error);
    res.status(500).json({ message: 'Failed to update accessory review' });
  }
};

// -----------------------------
// Delete Review
// -----------------------------
const deleteAccessoryReview = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.accessoryReview.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ message: 'Accessory review not found' });
    }

    await prisma.accessoryReview.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: 'Accessory review deleted successfully' });
  } catch (error) {
    console.error('Error deleting accessory review:', error);
    res.status(500).json({ message: 'Failed to delete accessory review' });
  }
};

module.exports = {
  getAllAccessoryReviews,
  getAccessoryReviewById,
  createAccessoryReview,
  updateAccessoryReview,
  deleteAccessoryReview,
};
