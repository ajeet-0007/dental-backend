export interface ShippingPricingConfig {
  flatCharge: number;
  freeShippingThreshold: number;
}

export const DEFAULT_SHIPPING_PRICING: ShippingPricingConfig = {
  flatCharge: 100,
  freeShippingThreshold: 2499,
};

export function parsePricingNumber(value: unknown, fallback: number): number {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveShippingCharge(
  subtotal: number,
  config: ShippingPricingConfig = DEFAULT_SHIPPING_PRICING,
): number {
  const value = Number(subtotal);
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  const threshold = parsePricingNumber(config.freeShippingThreshold, DEFAULT_SHIPPING_PRICING.freeShippingThreshold);
  if (threshold > 0 && value >= threshold) {
    return 0;
  }

  const flatCharge = parsePricingNumber(config.flatCharge, DEFAULT_SHIPPING_PRICING.flatCharge);
  return flatCharge > 0 ? flatCharge : 0;
}