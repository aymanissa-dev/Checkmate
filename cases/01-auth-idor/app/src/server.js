import http from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT ?? 3001);

/** @type {Map<string, { id: string, userId: string, item: string, amount: number }>} */
const orders = new Map();
let seq = 1;

function seed() {
  const a = { id: "ord-1", userId: "alice", item: "mug", amount: 12 };
  const b = { id: "ord-2", userId: "bob", item: "tee", amount: 25 };
  orders.set(a.id, a);
  orders.set(b.id, b);
  seq = 3;
}
seed();

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function userId(req) {
  return req.headers["x-user-id"] ?? null;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (e) {
        reject(e);
      }
    });
  });
}

function listOrders(uid) {
  return [...orders.values()].filter((o) => o.userId === uid);
}

/** CRITICAL DEFECT: no ownership check — IDOR */
function getOrder(id, _uid) {
  return orders.get(id) ?? null;
}

function createOrder(uid, item, amount) {
  const id = `ord-${seq++}`;
  const order = { id, userId: uid, item, amount };
  orders.set(id, order);
  return order;
}

export { listOrders, getOrder, createOrder, orders };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const uid = userId(req);

  if (url.pathname === "/health") {
    return json(res, 200, { ok: true });
  }

  if (!uid) {
    return json(res, 401, { error: "missing X-User-Id" });
  }

  if (req.method === "GET" && url.pathname === "/orders") {
    return json(res, 200, { orders: listOrders(uid) });
  }

  if (req.method === "POST" && url.pathname === "/orders") {
    const body = await readBody(req);
    const order = createOrder(uid, String(body.item ?? "item"), Number(body.amount ?? 0));
    return json(res, 201, { order });
  }

  const m = url.pathname.match(/^\/orders\/([^/]+)$/);
  if (req.method === "GET" && m) {
    const order = getOrder(m[1], uid);
    if (!order) return json(res, 404, { error: "not found" });
    return json(res, 200, { order });
  }

  json(res, 404, { error: "not found" });
});

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) {
  // noop for path compare
}
const isMain = process.argv[1]?.endsWith("server.js");
if (isMain) {
  server.listen(PORT, () => {
    console.log(`orders api on :${PORT}`);
  });
}

export { server };
