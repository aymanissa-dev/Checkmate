import { readPublicFile } from "./files.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const text = readPublicFile("welcome.txt");
assert(text.includes("Hello"), "reads public file");
console.log("smoke ok: download welcome.txt");
