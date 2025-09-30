/*
  Warnings:

  - You are about to drop the column `brand` on the `Part` table. All the data in the column will be lost.
  - Added the required column `subcategory` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Part" DROP COLUMN "brand",
ADD COLUMN     "subcategory" TEXT NOT NULL;
