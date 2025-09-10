const { PrismaClient } = require("./../generated/prisma");
const prisma = new PrismaClient();

const products = require('../data/products_with_brands_fixed.json');

async function main() {
  console.log("🌱 Starting database seeding (Boxed Products)...");

  // Step 1: Create categories
  const allCategories = [...new Set(products.flatMap((p) => p.categories))];

  for (const categoryName of allCategories) {
    await prisma.category.upsert({
      where: { name: categoryName.trim() },
      update: {},
      create: { name: categoryName.trim() },
    });
    console.log(`✅ Category ensured: ${categoryName}`);
  }

  // Step 2: Insert boxed products
  for (const product of products) {
    await prisma.product.create({
      data: {
        name: product.name,
        description: product.description,
        actualPrice: product.actualPrice,
        sellingPrice: product.sellingPrice,
        brand: product.brand,
        boxpack: true,
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
    console.log(`✅ Boxed Product created: ${product.name}`);
  }

  console.log("🌱 Database seeding completed (Boxed Products)!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
