-- Fix: CCCD đúng ra của người gửi (Customer VN), không phải Recipient.
-- + linkedPickupCode (text reference, KHÔNG link table) cho Order.

-- Move nationalId từ recipients → customers
ALTER TABLE "customers" ADD COLUMN "nationalId" TEXT;
ALTER TABLE "recipients" DROP COLUMN "nationalId";

-- Order: linkedPickupCode (sale nhập tay nếu có pickup từ trước — chỉ reference text)
ALTER TABLE "orders" ADD COLUMN "linkedPickupCode" TEXT;
