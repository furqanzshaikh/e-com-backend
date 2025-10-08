// prisma/seedSuperAdmin.js
const { PrismaClient } = require("./../generated/prisma");
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin@example.com';
  const password = 'SuperAdmin@123'; // ⚠️ Change this or load from env
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check if super admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    console.log('✅ Super admin already exists.');
  } else {
    await prisma.user.create({
      data: {
        name: 'Super Admin',
        email,
        password: hashedPassword,
        role: 'SUPPER_ADMIN',
      },
    });
    console.log('🎉 Super admin created successfully!');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error('❌ Error seeding super admin:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
