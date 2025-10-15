-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "amount" DOUBLE PRECISION,
ADD COLUMN     "currency" TEXT DEFAULT 'INR',
ADD COLUMN     "paymentMethod" TEXT,
ALTER COLUMN "paymentId" DROP NOT NULL;
