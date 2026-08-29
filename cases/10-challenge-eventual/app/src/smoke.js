import { checkout, getStock, reset } from "./checkout.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

reset();
assert(getStock("sku-flash") === 1, "seed stock");
await checkout("sku-flash", 1);
assert(getStock("sku-flash") === 0, "sequential checkout");
console.log("smoke ok: sequential checkout");
