const { PrismaClient } = require("./../generated/prisma");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  console.log(`📂 Reading product data...`);

  // Define file paths
  const normalFilePath = path.join(__dirname, "../data/products_with_brands_fixed.json");
  const unboxedFilePath = path.join(__dirname, "../data/products_with_brands_unboxed_fixed.json");
  const accesoryFilePath = path.join(__dirname, "../data/accesory.json");

  // Step 1: Clear old data
  console.log("🗑️ Deleting existing products and accessories...");
  await prisma.product.deleteMany({});
  await prisma.accessory.deleteMany({});
  console.log("✅ Old products & accessories removed.");

  // Step 2: Load JSON
  const normalProducts = JSON.parse(fs.readFileSync(normalFilePath, "utf-8"));
  const unboxedProducts = JSON.parse(fs.readFileSync(unboxedFilePath, "utf-8"));
  const accessoryProducts = JSON.parse(fs.readFileSync(accesoryFilePath, "utf-8"));

  console.log(`✅ Found: Products=${normalProducts.length + unboxedProducts.length}, Accessories=${accessoryProducts.length}`);

  // Step 3: Create categories
  const allCategories = new Set();
  [...normalProducts, ...unboxedProducts, ...accessoryProducts].forEach((p) =>
    p.categories.forEach((cat) => allCategories.add(cat.trim()))
  );

  console.log(`🛠️ Ensuring ${allCategories.size} categories exist...`);
  await Promise.all(
    [...allCategories].map((catName) =>
      prisma.category.upsert({
        where: { name: catName },
        update: {},
        create: { name: catName },
      })
    )
  );
  console.log("✅ Categories ensured.");

  // Step 4: Insert products
  console.log("🚀 Creating products...");
  await Promise.all(
    [...normalProducts, ...unboxedProducts].map((product) =>
      prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          actualPrice: product.actualPrice,
          sellingPrice: product.sellingPrice,
          brand: product.brand,
          boxpack: product.boxpack,
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
      }).catch((err) => {
        console.error(`❌ Failed to create product ${product.name}:`, err.message);
      })
    )
  );

  // Step 5: Insert accessories
  console.log("🔧 Creating accessories...");
  await Promise.all(
    accessoryProducts.map((accessory) =>
      prisma.accessory.create({
        data: {
          name: accessory.name,
          description: accessory.description,
          actualPrice: accessory.actualPrice,
          sellingPrice: accessory.sellingPrice,
          brand: accessory.brand,
          compatibility: accessory.compatibility || null,
          boxpack: accessory.boxpack,
          stock: accessory.stock,
          categories: {
            connect: accessory.categories.map((cat) => ({
              name: cat.trim(),
            })),
          },
          images: {
            create: accessory.images.map((img) => ({
              url: img.url,
              alt: img.alt || accessory.name,
            })),
          },
        },
      }).catch((err) => {
        console.error(`❌ Failed to create accessory ${accessory.name}:`, err.message);
      })
    )
  );

  console.log("🎉 All products & accessories inserted successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeder error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
