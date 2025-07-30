/*
  Warnings:

  - You are about to drop the column `actualPrice` on the `Part` table. All the data in the column will be lost.
  - You are about to drop the column `boxpack` on the `Part` table. All the data in the column will be lost.
  - You are about to drop the column `brand` on the `Part` table. All the data in the column will be lost.
  - You are about to drop the column `compatibility` on the `Part` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Part` table. All the data in the column will be lost.
  - You are about to drop the column `sellingPrice` on the `Part` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Part` table. All the data in the column will be lost.
  - Added the required column `price` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Part` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Part" DROP COLUMN "actualPrice",
DROP COLUMN "boxpack",
DROP COLUMN "brand",
DROP COLUMN "compatibility",
DROP COLUMN "description",
DROP COLUMN "sellingPrice",
DROP COLUMN "updatedAt",
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "type" TEXT NOT NULL,
ADD COLUMN     "userId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Part" ADD CONSTRAINT "Part_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
