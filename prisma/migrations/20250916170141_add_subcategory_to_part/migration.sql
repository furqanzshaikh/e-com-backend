/*
  Warnings:

  - You are about to drop the column `type` on the `Part` table. All the data in the column will be lost.
  - Added the required column `brand` to the `Part` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Part" DROP COLUMN "type",
ADD COLUMN     "brand" TEXT NOT NULL;
