-- AlterEnum: add the SALE role for sales staff (kept before DRIVER to match schema order).
ALTER TYPE "UserRole" ADD VALUE 'SALE' BEFORE 'DRIVER';

-- AlterTable: add hashed password for credential login (nullable — existing users have no password yet).
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
