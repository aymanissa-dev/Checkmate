import { signToken, verifyToken } from "./auth.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const token = signToken({ sub: "alice", role: "user" });
const payload = verifyToken(token);
assert(payload.sub === "alice", "signed token verifies");

console.log("smoke ok: signed JWT round-trip");
