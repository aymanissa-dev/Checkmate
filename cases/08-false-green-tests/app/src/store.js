import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "..", "data", "orders.json");

export function loadOrders() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch {
    return [];
  }
}

/**
 * REAL BUG: concatenates objects as strings → invalid JSON on disk.
 * Hidden by mocked tests.
 */
export function saveOrder(order) {
  const prev = loadOrders();
  // BUG: should JSON.stringify the array; instead naive append
  const broken = JSON.stringify(prev).replace(/]$/, "") + "," + order + "]";
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, broken);
  return order;
}

export function createOrder(item) {
  const order = { id: `o-${Date.now()}`, item, createdAt: new Date().toISOString() };
  saveOrder(order);
  return order;
}
