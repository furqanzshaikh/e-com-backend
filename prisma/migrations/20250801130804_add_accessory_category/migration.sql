/*
  Warnings:

  - You are about to drop the column `category` on the `Accessory` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Accessory" DROP COLUMN "category";

-- CreateTable
CREATE TABLE "Category" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_AccessoryToCategory" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AccessoryToCategory_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "_AccessoryToCategory_B_index" ON "_AccessoryToCategory"("B");

-- AddForeignKey
ALTER TABLE "_AccessoryToCategory" ADD CONSTRAINT "_AccessoryToCategory_A_fkey" FOREIGN KEY ("A") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccessoryToCategory" ADD CONSTRAINT "_AccessoryToCategory_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
