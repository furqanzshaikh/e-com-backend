const { PrismaClient } = require("../../generated/prisma");
const prisma = new PrismaClient();



 const createSale = async (req, res) => {
  try {
    const {
      title,
      description,
      discountType,
      discountValue,
      startDate,
      endDate,
      startTime,
      endTime,
    } = req.body;

    // Validate required fields
    if (!title || !discountType || !discountValue || !startDate || !endDate) {
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

    // Create sale
    const sale = await prisma.sale.create({
      data: {
        title,
        description,
        discountType,
        discountValue: parseFloat(discountValue),
        startDate: start,
        endDate: end,
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

 const getActiveSale = async (req, res) => {
  try {
    const now = new Date();

    const activeSale = await prisma.sale.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        isActive: true,
      },
    });

    if (!activeSale) {
      return res.json({ success: false, message: "No active sale" });
    }

    return res.json({ success: true, activeSale });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

 const getAllSales = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ success: true, data: sales });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


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
    deleteSale,
    getAllSales,
    getActiveSale,
    createSale
}
