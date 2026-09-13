-- Utility amounts move from the type (fixed forever) to a per-month bill.

-- CreateTable
CREATE TABLE "UtilityBill" (
    "id" SERIAL NOT NULL,
    "utilityTypeId" INTEGER NOT NULL,
    "monthCycleId" INTEGER NOT NULL,
    "sameForAll" BOOLEAN NOT NULL DEFAULT true,
    "amount" DECIMAL(8,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UtilityBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilityBillShare" (
    "id" SERIAL NOT NULL,
    "utilityBillId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,

    CONSTRAINT "UtilityBillShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UtilityBill_utilityTypeId_monthCycleId_key" ON "UtilityBill"("utilityTypeId", "monthCycleId");

-- CreateIndex
CREATE UNIQUE INDEX "UtilityBillShare_utilityBillId_userId_key" ON "UtilityBillShare"("utilityBillId", "userId");

-- AddForeignKey
ALTER TABLE "UtilityBill" ADD CONSTRAINT "UtilityBill_utilityTypeId_fkey" FOREIGN KEY ("utilityTypeId") REFERENCES "UtilityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityBill" ADD CONSTRAINT "UtilityBill_monthCycleId_fkey" FOREIGN KEY ("monthCycleId") REFERENCES "MonthCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityBillShare" ADD CONSTRAINT "UtilityBillShare_utilityBillId_fkey" FOREIGN KEY ("utilityBillId") REFERENCES "UtilityBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityBillShare" ADD CONSTRAINT "UtilityBillShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data: carry each type's current amount into a bill for every month its
-- group already has, so nothing that is on screen today disappears.
INSERT INTO "UtilityBill" ("utilityTypeId", "monthCycleId", "sameForAll", "amount", "updatedAt")
SELECT t."id", m."id", t."sameForAll", t."amount", CURRENT_TIMESTAMP
FROM "UtilityType" t
JOIN "MonthCycle" m ON m."groupId" = t."groupId";

INSERT INTO "UtilityBillShare" ("utilityBillId", "userId", "amount")
SELECT b."id", a."userId", a."amount"
FROM "UtilityAmount" a
JOIN "UtilityBill" b ON b."utilityTypeId" = a."utilityTypeId";

-- DropTable
DROP TABLE "UtilityAmount";

-- AlterTable
ALTER TABLE "UtilityType" DROP COLUMN "amount",
DROP COLUMN "sameForAll";
