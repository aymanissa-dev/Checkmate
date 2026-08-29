import http from "node:http";
import { checkout, getStock } from "./checkout.js";

const PORT = Number(process.env.PORT ?? 3010);

const server = http.createServer(async (req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/health") return json(200, { ok: true });
  if (url.pathname.startsWith("/stock/")) {
    const sku = url.pathname.split("/")[2];
    return json(200, { sku, stock: getStock(sku) });
  }
  if (req.method === "POST" && url.pathname === "/checkout") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    try {
      return json(200, { result: await checkout(body.sku, Number(body.qty ?? 1)) });
    } catch (e) {
      return json(409, { error: String(e.message ?? e) });
    }
  }
  json(404, { error: "not found" });
});

if (process.argv[1]?.endsWith("server.js")) {
  server.listen(PORT, () => console.log(`checkout on :${PORT}`));
}
