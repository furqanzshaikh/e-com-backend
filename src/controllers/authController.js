const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

const JWT_SECRET = 'your_secret_key_here'; 


exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    res.status(201).json({ message: 'User registered', user: { id: user.id, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Registration error', error: err.message });
  }
};




exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 1. Normalize email
    const userEmail = email.toLowerCase();

    // 2. Find user by email
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 4. Create JWT
    const token = jwt.sign(
      {
        userId: user.id,
        name: user.name, // optional
        role: user.role, // include role
        email:user.email
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // 5. Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // true in prod
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    // 6. Send response
    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};






