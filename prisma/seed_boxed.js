require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require("./../generated/prisma");
const prisma = new PrismaClient();

const products = require('../data/boxed_final_filled_fixed.json');

async function main() {
  console.log("🌱 Starting database seeding (Boxed Products)...");

  // Step 1: Collect all categories safely
  const allCategories = [
    ...new Set(
      products.flatMap((p) => {
        if (Array.isArray(p.categories)) return p.categories;
        if (typeof p.categories === "string") return [p.categories];
        return [];
      })
    ),
  ];

  // Step 2: Ensure categories exist
  for (const categoryName of allCategories) {
    if (typeof categoryName === "string" && categoryName.trim() !== "") {
      await prisma.category.upsert({
        where: { name: categoryName.trim() },
        update: {},
        create: { name: categoryName.trim() },
      });
      console.log(`✅ Category ensured: ${categoryName}`);
    }
  }

  // Step 3: Insert boxed products
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
          connect: (Array.isArray(product.categories)
            ? product.categories
            : [product.categories]
          )
            .filter((cat) => typeof cat === "string" && cat.trim() !== "")
            .map((cat) => ({ name: cat.trim() })),
        },
        images: {
          create: (Array.isArray(product.images) ? product.images : [])
            .filter((img) => typeof img === "string" && img.trim() !== "")
            .map((imgUrl) => ({
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
