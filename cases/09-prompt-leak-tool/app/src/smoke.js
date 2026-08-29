import { echo, listTools } from "./tools.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

assert(listTools().includes("echo"), "lists echo");
assert(echo("hi").text === "hi", "echo works");
console.log("smoke ok: echo tool");
