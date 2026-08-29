import { findUsersByName, listUsers } from "./db.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(listUsers().length >= 3, "seeded users");
const hits = findUsersByName("alice");
assert(hits.length === 1 && hits[0].name === "alice", "happy path search");
console.log("smoke ok: user search");
