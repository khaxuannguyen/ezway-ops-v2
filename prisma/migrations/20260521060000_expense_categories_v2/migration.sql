-- AlterEnum: replace ExpenseCategory values with the company's real categories.
-- All existing rows were pre-set to 'OTHER' (kept in both old and new enum).
BEGIN;
CREATE TYPE "ExpenseCategory_new" AS ENUM ('PACKAGING_EQUIPMENT', 'FOOD_ENTERTAINMENT', 'OPERATIONS_WAREHOUSE', 'OPENING_BRANDING', 'OTHER');
ALTER TABLE "startup_expenses" ALTER COLUMN "category" DROP DEFAULT;
ALTER TABLE "startup_expenses" ALTER COLUMN "category" TYPE "ExpenseCategory_new" USING ("category"::text::"ExpenseCategory_new");
ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old";
ALTER TYPE "ExpenseCategory_new" RENAME TO "ExpenseCategory";
DROP TYPE "ExpenseCategory_old";
ALTER TABLE "startup_expenses" ALTER COLUMN "category" SET DEFAULT 'OTHER';
COMMIT;
