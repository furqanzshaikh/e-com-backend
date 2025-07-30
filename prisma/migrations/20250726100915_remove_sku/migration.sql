/*
  Warnings:

  - You are about to drop the column `sku` on the `Accessory` table. All the data in the column will be lost.
  - You are about to drop the column `sku` on the `Product` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Accessory_sku_key";

-- DropIndex
DROP INDEX "Product_sku_key";

-- AlterTable
ALTER TABLE "Accessory" DROP COLUMN "sku";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "sku";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';
