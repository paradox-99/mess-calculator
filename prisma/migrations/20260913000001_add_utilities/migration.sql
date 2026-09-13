-- CreateTable
CREATE TABLE "UtilityType" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(8,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UtilityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilityPayment" (
    "id" SERIAL NOT NULL,
    "utilityTypeId" INTEGER NOT NULL,
    "monthCycleId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UtilityPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UtilityType_groupId_isActive_idx" ON "UtilityType"("groupId", "isActive");

-- CreateIndex
CREATE INDEX "UtilityPayment_monthCycleId_userId_idx" ON "UtilityPayment"("monthCycleId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UtilityPayment_utilityTypeId_monthCycleId_userId_key" ON "UtilityPayment"("utilityTypeId", "monthCycleId", "userId");

-- AddForeignKey
ALTER TABLE "UtilityType" ADD CONSTRAINT "UtilityType_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityPayment" ADD CONSTRAINT "UtilityPayment_utilityTypeId_fkey" FOREIGN KEY ("utilityTypeId") REFERENCES "UtilityType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityPayment" ADD CONSTRAINT "UtilityPayment_monthCycleId_fkey" FOREIGN KEY ("monthCycleId") REFERENCES "MonthCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilityPayment" ADD CONSTRAINT "UtilityPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
