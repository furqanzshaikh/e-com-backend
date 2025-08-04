/*
  Warnings:

  - You are about to drop the `_AccessoryToCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_AccessoryToCategory" DROP CONSTRAINT "_AccessoryToCategory_A_fkey";

-- DropForeignKey
ALTER TABLE "_AccessoryToCategory" DROP CONSTRAINT "_AccessoryToCategory_B_fkey";

-- DropTable
DROP TABLE "_AccessoryToCategory";

-- CreateTable
CREATE TABLE "_AccessoryCategories" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AccessoryCategories_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AccessoryCategories_B_index" ON "_AccessoryCategories"("B");

-- AddForeignKey
ALTER TABLE "_AccessoryCategories" ADD CONSTRAINT "_AccessoryCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Accessory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AccessoryCategories" ADD CONSTRAINT "_AccessoryCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
