-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('LEGAL', 'OFFICE', 'EQUIPMENT', 'SOFTWARE', 'MARKETING', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('UNPAID', 'PAID');

-- CreateTable
CREATE TABLE "startup_expenses" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "itemName" TEXT NOT NULL,
    "amountVnd" INTEGER NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'UNPAID',
    "paymentDate" TIMESTAMP(3),
    "paidBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "startup_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "startup_expenses_code_key" ON "startup_expenses"("code");
