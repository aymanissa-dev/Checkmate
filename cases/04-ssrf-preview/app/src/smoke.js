import { isHttpUrl } from "./preview.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(isHttpUrl("https://example.com"), "https ok");
assert(!isHttpUrl("not a url"), "invalid rejected");
console.log("smoke ok: url validation happy path (fetch not required offline)");
