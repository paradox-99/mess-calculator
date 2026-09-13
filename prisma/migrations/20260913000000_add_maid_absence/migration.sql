-- CreateTable
CREATE TABLE "MaidAbsence" (
    "id" SERIAL NOT NULL,
    "monthCycleId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "lunch" BOOLEAN NOT NULL DEFAULT false,
    "dinner" BOOLEAN NOT NULL DEFAULT false,
    "markedById" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaidAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaidAbsence_monthCycleId_date_key" ON "MaidAbsence"("monthCycleId", "date");

-- AddForeignKey
ALTER TABLE "MaidAbsence" ADD CONSTRAINT "MaidAbsence_monthCycleId_fkey" FOREIGN KEY ("monthCycleId") REFERENCES "MonthCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaidAbsence" ADD CONSTRAINT "MaidAbsence_markedById_fkey" FOREIGN KEY ("markedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
