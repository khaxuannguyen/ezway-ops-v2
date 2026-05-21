import type { ExtraCostInput } from "./types";

export function sumExtraCosts(extras: readonly ExtraCostInput[]): number {
  return extras.reduce((sum, e) => sum + e.amountVnd, 0);
}

export interface ProfitInput {
  totalFeeVnd: number;
  baseCostVnd: number;
  extraCostTotalVnd: number;
}

export function calculateOrderProfit(input: ProfitInput): number {
  return input.totalFeeVnd - input.baseCostVnd - input.extraCostTotalVnd;
}

export interface OrderTotals {
  baseCostVnd: number;
  extraCostTotalVnd: number;
  totalFeeVnd: number;
  profitVnd: number;
}

export function buildOrderTotals(args: {
  baseCostVnd: number;
  extras: readonly ExtraCostInput[];
  customerFeeVnd: number;
}): OrderTotals {
  const extraCostTotalVnd = sumExtraCosts(args.extras);
  const totalFeeVnd = args.customerFeeVnd;
  const profitVnd = calculateOrderProfit({
    totalFeeVnd,
    baseCostVnd: args.baseCostVnd,
    extraCostTotalVnd,
  });
  return {
    baseCostVnd: args.baseCostVnd,
    extraCostTotalVnd,
    totalFeeVnd,
    profitVnd,
  };
}
