import { getBalance, transfer, reset } from "./wallet.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

reset();
assert(getBalance("alice") === 100, "seed");
await transfer("alice", "bob", 10);
assert(getBalance("alice") === 90, "debit");
assert(getBalance("bob") === 60, "credit");
console.log("smoke ok: sequential transfer");
