require('dotenv').config({ path: '../.env' });
const { PrismaClient } = require("./../generated/prisma");
const prisma = new PrismaClient();

// Load accessories data
const accessories = require('../data/accesory.json');

async function main() {
  console.log("🌱 Starting database seeding (Accessories)...");

  // Step 1: Ensure all categories exist
  const allCategories = [...new Set(accessories.flatMap((a) => a.categories))];

  for (const categoryName of allCategories) {
    await prisma.category.upsert({
      where: { name: categoryName.trim() },
      update: {},
      create: { name: categoryName.trim() },
    });
    console.log(`✅ Category ensured: ${categoryName}`);
  }

  // Step 2: Insert accessories
  for (const accessory of accessories) {
    await prisma.accessory.create({
      data: {
        name: accessory.boxpack ? accessory.name : `${accessory.name} (Unboxed)`,
        description: accessory.description || "",
        actualPrice: accessory.actualPrice || 0,
        sellingPrice: accessory.sellingPrice || 0,
        brand: accessory.brand || "",
        boxpack: Boolean(accessory.boxpack),
        stock: accessory.stock || 0,
        categories: {
          connect: accessory.categories.map((catName) => ({ name: catName.trim() })),
        },
        images: {
          create: accessory.images.map((img) => {
            // Handle both object { url, alt } or string URL
            if (typeof img === "string") {
              return { url: img, alt: accessory.name };
            } else if (typeof img === "object" && img.url) {
              return { url: img.url, alt: img.alt || accessory.name };
            } else {
              throw new Error(`Invalid image format for accessory: ${accessory.name}`);
            }
          }),
        },
      },
    });

    console.log(`✅ Accessory created: ${accessory.boxpack ? accessory.name : accessory.name + " (Unboxed)"}`);
  }

  console.log("🌱 Database seeding completed (Accessories)!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
