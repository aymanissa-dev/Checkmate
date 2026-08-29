import { listOrders, getOrder, createOrder } from "./server.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const mine = listOrders("alice");
assert(mine.length >= 1, "alice should have orders");
assert(mine.every((o) => o.userId === "alice"), "list filters by user");

const created = createOrder("alice", "sticker", 3);
assert(created.userId === "alice", "create sets owner");
assert(getOrder(created.id, "alice")?.item === "sticker", "owner can fetch");

console.log("smoke ok: happy path list/create/get");
