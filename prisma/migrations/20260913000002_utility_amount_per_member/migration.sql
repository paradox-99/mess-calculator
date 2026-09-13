-- AlterTable
ALTER TABLE "UtilityType" ADD COLUMN     "sameForAll" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "amount" DROP NOT NULL;

-- CreateTable
CREATE TABLE "UtilityAmount" (
    "id" SERIAL NOT NULL,
    "utilityTypeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "UtilityAmount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UtilityAmount_utilityTypeId_userId_key" ON "UtilityAmount"("utilityTypeId", "userId");

-- AddForeignKey
ALTER TABLE "UtilityAmount" ADD CONSTRAINT "UtilityAmount_utilityTypeId_fkey" FOREIGN KEY ("utilityTypeId") REFERENCES "UtilityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityAmount" ADD CONSTRAINT "UtilityAmount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
