-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_productId_fkey";

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "accessoryId" INTEGER,
ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_accessoryId_fkey" FOREIGN KEY ("accessoryId") REFERENCES "Accessory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
