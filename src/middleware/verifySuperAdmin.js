const jwt = require("jsonwebtoken");
const { PrismaClient } = require("../../generated/prisma");
const prisma = new PrismaClient();

const verifySuperAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // decoded = { userId: 2, iat: ..., exp: ... }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.role !== "SUPER_ADMIN") {
      return res.status(403).json({ error: "Access denied. Super Admin only." });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = verifySuperAdmin;
