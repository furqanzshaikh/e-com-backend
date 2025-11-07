const { PrismaClient } = require("../../generated/prisma");
const prisma = new PrismaClient();

// ✅ Create Sale
const createSale = async (req, res) => {
  try {
    const { title, startDate, endDate, startTime, endTime } = req.body;

    // Validate required fields
    if (!title || !startDate || !endDate) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    // Parse and validate date/time
    const start = new Date(`${startDate}T${startTime || "00:00"}:00Z`);
    const end = new Date(`${endDate}T${endTime || "23:59"}:59Z`);

    if (isNaN(start) || isNaN(end)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid date or time format" });
    }

    // Create sale (only fields that exist in model)
    const sale = await prisma.sale.create({
      data: {
        title,
        startTime: start,
        endTime: end,
        isActive: true,
      },
    });

    return res.status(201).json({ success: true, sale });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ✅ Get Active Sale
const getActiveSale = async (req, res) => {
  try {
    const now = new Date();

    // Find an ongoing sale first
    let activeSale = await prisma.sale.findFirst({
      where: {
        startTime: { lte: now },
        endTime: { gte: now },
        isActive: true,
      },
    });

    // If no ongoing sale, find the next upcoming one
    if (!activeSale) {
      activeSale = await prisma.sale.findFirst({
        where: {
          startTime: { gt: now },
          isActive: true,
        },
        orderBy: { startTime: "asc" },
      });
    }

    if (!activeSale) {
      return res.json({ success: false, message: "No active or upcoming sale" });
    }

    return res.json({ success: true, activeSale });
  } catch (error) {
    console.error("Error fetching sale:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ✅ Get All Sales
const getAllSales = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ✅ Delete Sale
const deleteSale = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.sale.delete({ where: { id } });
    res.json({ success: true, message: "Sale deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

module.exports = {
  createSale,
  getActiveSale,
  getAllSales,
  deleteSale,
};
