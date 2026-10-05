import assert from "node:assert/strict";
import test from "node:test";
import { priceTotals } from "./pricing";

const rules = { freeOver: 50, shippingFee: 12, taxRate: 0.08 };

test("percent coupon and free shipping over the threshold", () => {
  const result = priceTotals(100, { type: "PERCENT", amount: 10 }, rules);
  assert.equal(result.discount, 10);
  assert.equal(result.discounted, 90);
  assert.equal(result.shipping, 0);
  assert.equal(result.tax, 7.2);
  assert.equal(result.total, 97.2);
});

test("small order without a coupon pays shipping", () => {
  const result = priceTotals(20, null, rules);
  assert.equal(result.shipping, 12);
  assert.equal(result.tax, 1.6);
  assert.equal(result.total, 33.6);
});

test("free-shipping coupon removes the delivery fee", () => {
  const result = priceTotals(20, { type: "SHIPPING", amount: 0 }, rules);
  assert.equal(result.shipping, 0);
  assert.equal(result.total, 21.6);
});

test("empty cart does not invent a shipping fee", () => {
  const result = priceTotals(0, null, rules);
  assert.equal(result.total, 0);
});
