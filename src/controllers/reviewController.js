const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

// -----------------------------
// Helper: Extract user info from Bearer Token
// -----------------------------
const getUserFromToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded; // should include { id, name, email }
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
};

// -----------------------------
// Get All Reviews
// -----------------------------
const getAllReviews = async (req, res) => {
  try {
    const { productId } = req.query;
    const where = productId ? { productId: Number(productId) } : {};

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
};

// -----------------------------
// Get Review by ID
// -----------------------------
const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await prisma.review.findUnique({
      where: { id: Number(id) },
    });

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.status(200).json(review);
  } catch (error) {
    console.error("Error fetching review:", error);
    res.status(500).json({ message: "Failed to fetch review" });
  }
};

// -----------------------------
// Create Review (Reviewer from Token)
// -----------------------------
const createReview = async (req, res) => {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized or invalid token' });
    }

    const { productId, rating, comment } = req.body;

    if (!productId || !rating) {
      return res.status(400).json({ message: 'productId and rating are required' });
    }

    const newReview = await prisma.review.create({
      data: {
        productId: Number(productId),
        rating: Number(rating),
        comment,
        reviewer: user.name || user.email || 'Anonymous',
      },
    });

    res.status(201).json({
      message: 'Review created successfully',
      review: newReview,
    });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Failed to create review' });
  }
};

// -----------------------------
// Update Review
// -----------------------------
const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const existing = await prisma.review.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const updatedReview = await prisma.review.update({
      where: { id: Number(id) },
      data: { rating, comment },
    });

    res.status(200).json({
      message: 'Review updated successfully',
      review: updatedReview,
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Failed to update review' });
  }
};

// -----------------------------
// Delete Review
// -----------------------------
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.review.findUnique({ where: { id: Number(id) } });
    if (!existing) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await prisma.review.delete({ where: { id: Number(id) } });

    res.status(200).json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Failed to delete review' });
  }
};

module.exports = {
  getReviewById,
  getAllReviews,
  createReview,
  updateReview,
  deleteReview,
};
