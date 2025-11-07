const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();


exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      expiryDate,
    } = req.body;

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discountType,
        discountValue: parseFloat(discountValue),
        minPurchaseAmount: parseFloat(minPurchaseAmount) || 0,
        maxDiscountAmount: maxDiscountAmount
          ? parseFloat(maxDiscountAmount)
          : null,
        expiryDate: new Date(expiryDate),
      },
    });

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      data: coupon,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

/**
 * @desc Get all coupons
 */
exports.getCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data: coupons });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};


exports.deleteCoupon = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.coupon.delete({ where: { id } });
    res.json({ success: true, message: "Coupon deleted successfully" });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};


exports.applyCoupon = async (req, res) => {
  try {
    const { code, totalAmount } = req.body;

    // ✅ Validate inputs
    if (!code || totalAmount == null) {
      return res
        .status(400)
        .json({ success: false, error: "Coupon code and total amount are required" });
    }

    const total = parseFloat(totalAmount);
    if (isNaN(total) || total <= 0) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid total amount" });
    }

    // ✅ Fetch coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive)
      return res.status(400).json({ success: false, error: "Invalid or inactive coupon" });

    if (new Date(coupon.expiryDate) < new Date())
      return res.status(400).json({ success: false, error: "Coupon expired" });

    if (total < coupon.minPurchaseAmount)
      return res.status(400).json({
        success: false,
        error: `Minimum purchase of ₹${coupon.minPurchaseAmount} required`,
      });

    // ✅ Calculate discount
    let discount = 0;

    if (coupon.discountType === "PERCENTAGE") {
      discount = (coupon.discountValue / 100) * total;
      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else {
      discount = coupon.discountValue;
    }

    const finalAmount = Math.max(total - discount, 0);

    return res.json({
      success: true,
      message: "Coupon applied successfully",
      appliedCoupon: coupon.code,
      discountAmount: Number(discount.toFixed(2)),
      finalAmount: Number(finalAmount.toFixed(2)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
