export type CouponRule = { type: string; amount: number } | null;

export type ShipRule = { freeOver: number; shippingFee: number; taxRate: number };

export function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function priceTotals(subtotal: number, coupon: CouponRule, rules: ShipRule) {
  let discount = 0;
  let freeShipping = false;
  if (coupon?.type === "PERCENT") discount = subtotal * (Number(coupon.amount) / 100);
  if (coupon?.type === "SHIPPING") freeShipping = true;
  const discounted = Math.max(0, round2(subtotal - discount));
  const shipping = subtotal === 0 || freeShipping || discounted >= rules.freeOver ? 0 : rules.shippingFee;
  const tax = round2(discounted * rules.taxRate);
  const total = round2(discounted + shipping + tax);
  return { discount: round2(discount), discounted, shipping, tax, total };
}
