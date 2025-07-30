-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "partId" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "partId" INTEGER;

-- CreateTable
CREATE TABLE "Part" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "actualPrice" DOUBLE PRECISION,
    "sellingPrice" DOUBLE PRECISION,
    "compatibility" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "boxpack" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartImage" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "partId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomBuild" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "buildName" TEXT NOT NULL,
    "components" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomBuild_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PartImage" ADD CONSTRAINT "PartImage_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomBuild" ADD CONSTRAINT "CustomBuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
