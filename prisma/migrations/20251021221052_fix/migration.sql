/*
  Warnings:

  - You are about to drop the column `orderMetadata` on the `Order` table. All the data in the column will be lost.
  - The primary key for the `Payment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `cashfreeOrderId` on the `Payment` table. All the data in the column will be lost.
  - The `id` column on the `Payment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "Payment_cashfreeOrderId_idx";

-- DropIndex
DROP INDEX "Payment_cashfreeOrderId_key";

-- DropIndex
DROP INDEX "Payment_orderId_idx";

-- DropIndex
DROP INDEX "Payment_paymentId_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "orderMetadata";

-- AlterTable
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_pkey",
DROP COLUMN "cashfreeOrderId",
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "rawWebhookData" SET DATA TYPE TEXT,
ADD CONSTRAINT "Payment_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER';
