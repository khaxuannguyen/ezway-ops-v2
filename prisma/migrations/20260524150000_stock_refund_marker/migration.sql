-- Cancel order → tự hoàn kho: đánh dấu OUT movement đã hoàn để chống hoàn 2 lần.
ALTER TABLE "stock_movements" ADD COLUMN "refundedAt" TIMESTAMP(3);
