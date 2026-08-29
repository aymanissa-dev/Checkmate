const inventory = new Map([["sku-flash", 1]]);

export function getStock(sku) {
  return inventory.get(sku) ?? 0;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * CRITICAL DEFECT: non-atomic stock check + decrement → oversell under concurrency.
 */
export async function checkout(sku, qty = 1) {
  const stock = getStock(sku);
  if (stock < qty) throw new Error("sold out");
  await sleep(8);
  inventory.set(sku, getStock(sku) - qty);
  return { sku, qty, remaining: getStock(sku) };
}

export function reset() {
  inventory.set("sku-flash", 1);
}

export { inventory };
