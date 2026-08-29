import http from "node:http";
import { createOrder, loadOrders } from "./store.js";

const PORT = Number(process.env.PORT ?? 3008);

const server = http.createServer(async (req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  if (req.url === "/health") return json(200, { ok: true });
  if (req.method === "GET" && req.url === "/orders") {
    return json(200, { orders: loadOrders() });
  }
  if (req.method === "POST" && req.url === "/orders") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    return json(201, { order: createOrder(body.item ?? "x") });
  }
  json(404, { error: "not found" });
});

if (process.argv[1]?.endsWith("server.js")) {
  server.listen(PORT, () => console.log(`orders-persist on :${PORT}`));
}
