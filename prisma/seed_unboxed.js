require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require("./../generated/prisma");
const prisma = new PrismaClient();

const unboxedProducts = require('../data/Products_Unboxed_Final.json');

async function main() {
  console.log("🌱 Starting database seeding (Unboxed Products)...");

  // Step 1: Create categories
  const allCategories = [...new Set(unboxedProducts.flatMap((p) => p.categories))];

  for (const categoryName of allCategories) {
    await prisma.category.upsert({
      where: { name: categoryName.trim() },
      update: {},
      create: { name: categoryName.trim() },
    });
    console.log(`✅ Category ensured: ${categoryName}`);
  }

  // Step 2: Insert unboxed products
  for (const product of unboxedProducts) {
    await prisma.product.create({
      data: {
        name: `${product.name} (Unboxed)`,
        description: product.description,
        actualPrice: product.actualPrice,
        sellingPrice: product.sellingPrice,
        brand: product.brand,
        boxpack: false,
        stock: product.stock,
        categories: {
          connect: product.categories.map((catName) => ({ name: catName.trim() })),
        },
        images: {
          create: product.images.map((imgUrl) => ({
            url: imgUrl,
            alt: product.name,
          })),
        },
      },
    });
    console.log(`✅ Unboxed Product created: ${product.name}`);
  }

  console.log("🌱 Database seeding completed (Unboxed Products)!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
