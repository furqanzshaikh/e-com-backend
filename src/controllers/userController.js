const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user:"furqanshaikh939@gmail.com",
    pass: 'smdj irys luou kzve'
  },
});
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.status(200).json({ message: "Success", data: users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json({ message: "Success", data: user });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

const createUser = async (req, res) => {
  const { name, email, password, role = 'USER' } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ error: "Name, email, and password are required" });

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(409).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        otp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
      },
      select: {
        id: true,
        email: true,
        verified: true,
        otp: true,          // 👈 Add this temporarily to see it in response
        otpExpires: true,   // 👈 same
      },
    });

    await transporter.sendMail({
      from:"furqanshaikh939@gmail.com",
      to: email,
      subject: "Email Verification OTP",
      text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
    });

    res.status(201).json({
      message: "User registered successfully. OTP sent.",
      user: newUser,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
};


// 🔒 Verify OTP
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.verified) return res.status(400).json({ error: "User already verified" });
    if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (user.otpExpires < new Date()) return res.status(400).json({ error: "OTP expired" });

    await prisma.user.update({
      where: { email },
      data: {
        verified: true,
        otp: null,
        otpExpires: null,
      },
    });

    res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ error: "Failed to verify OTP" });
  }
};

// ✅ Optional: Resend OTP
const resendOtp = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email required" });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.verified) return res.status(400).json({ error: "User already verified" });

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.user.update({
      where: { email },
      data: {
        otp: newOtp,
        otpExpires: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Resend Email Verification OTP",
      text: `Your new OTP is ${newOtp}. It will expire in 10 minutes.`,
    });

    res.status(200).json({ message: "New OTP sent to email" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    res.status(500).json({ error: "Failed to resend OTP" });
  }
};
// Update user
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role } = req.body; // ✅ include role

  try {
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { name, email, role }, // ✅ include role
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ message: "User updated", data: updatedUser });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};


// Delete user
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
};

module.exports = {
  verifyOtp,
  resendOtp,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
