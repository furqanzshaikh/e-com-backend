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
  let { code, totalAmount } = req.body;

  try {
    totalAmount = Number(totalAmount); // ✅ Convert to number

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive)
      return res.status(400).json({ success: false, error: "Invalid coupon" });

    if (new Date(coupon.expiryDate) < new Date())
      return res
        .status(400)
        .json({ success: false, error: "Coupon expired" });

    if (totalAmount < coupon.minPurchaseAmount)
      return res.status(400).json({
        success: false,
        error: `Minimum purchase of ₹${coupon.minPurchaseAmount} required`,
      });

    let discount = 0;

    if (coupon.discountType === "PERCENTAGE") {
      discount = (coupon.discountValue / 100) * totalAmount;
      if (coupon.maxDiscountAmount)
        discount = Math.min(discount, coupon.maxDiscountAmount);
    } else {
      discount = coupon.discountValue;
    }

    const finalAmount = Math.max(totalAmount - discount, 0);

    res.json({
      success: true,
      discount: discount.toFixed(2),
      finalAmount: finalAmount.toFixed(2),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

