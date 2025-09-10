const { PrismaClient } = require("./../generated/prisma");
const prisma = new PrismaClient();

const products = require('../data/Products_Unboxed_Final.json');
const unboxedProducts = require('../data/Products_Unboxed_Final.json');
const accessories = require('../data/accesory.json');

async function main() {
  console.log("🌱 Starting database seeding...");

  // Step 1: Create categories (unique)
  console.log("📂 Creating categories...");
  const allCategories = [
    ...new Set([
      ...products.flatMap((p) => p.categories),
      ...unboxedProducts.flatMap((p) => p.categories),
      ...accessories.flatMap((a) => a.categories),
    ]),
  ];

  for (const categoryName of allCategories) {
    try {
      await prisma.category.upsert({
        where: { name: categoryName.trim() },
        update: {},
        create: { name: categoryName.trim() },
      });
      console.log(`✅ Category ensured: ${categoryName}`);
    } catch (err) {
      console.error(`❌ Failed to create category ${categoryName}:`, err.message);
    }
  }

  // Step 2: Create products (Boxed + Unboxed)
  console.log("💻 Creating products...");
  const allProducts = [...products, ...unboxedProducts];

  for (const product of allProducts) {
    try {
      await prisma.product.create({
        data: {
          name: product.boxpack ? product.name : `${product.name} (Unboxed)`,
          description: product.description,
          actualPrice: product.actualPrice,
          sellingPrice: product.sellingPrice,
          brand: product.brand,
          boxpack: Boolean(product.boxpack),
          stock: product.stock,
          categories: {
            connect: product.categories.map((catName) => ({
              name: catName.trim(),
            })),
          },
          images: {
            create: product.images.map((imgUrl) => ({
              url: imgUrl,
              alt: product.name,
            })),
          },
        },
      });
      console.log(`✅ Product created: ${product.boxpack ? product.name : product.name + " (Unboxed)"}`);
    } catch (err) {
      console.error(`❌ Failed to create product ${product.name}:`, err.message);
    }
  }

  // Step 3: Create accessories
  console.log("🎧 Creating accessories...");
  for (const accessory of accessories) {
    try {
      await prisma.accessory.create({
        data: {
          name: accessory.boxpack ? accessory.name : `${accessory.name} (Unboxed)`,
          description: accessory.description,
          actualPrice: accessory.actualPrice,
          sellingPrice: accessory.sellingPrice,
          brand: accessory.brand,
          boxpack: Boolean(accessory.boxpack),
          stock: accessory.stock,
          categories: {
            connect: accessory.categories.map((catName) => ({
              name: catName.trim(),
            })),
          },
          images: {
            create: accessory.images.map((imgUrl) => ({
              url: imgUrl,
              alt: accessory.name,
            })),
          },
        },
      });
      console.log(`✅ Accessory created: ${accessory.boxpack ? accessory.name : accessory.name + " (Unboxed)"}`);
    } catch (err) {
      console.error(`❌ Failed to create accessory ${accessory.name}:`, err.message);
    }
  }

  console.log("🌱 Database seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
