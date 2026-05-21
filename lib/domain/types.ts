export type CostRateType = "FIXED_TOTAL" | "PER_KG";

export interface RateTier {
  id: string;
  minWeightKg: number;
  maxWeightKg: number;
  rateType: CostRateType;
  amountVnd: number;
}

export interface ExtraCostInput {
  amountVnd: number;
}

export interface PackageDimensions {
  actualWeightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}
