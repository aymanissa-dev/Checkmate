import http from "node:http";
import { getBalance, transfer } from "./wallet.js";

const PORT = Number(process.env.PORT ?? 3005);

const server = http.createServer(async (req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/health") return json(200, { ok: true });
  if (url.pathname.startsWith("/balance/")) {
    const user = url.pathname.split("/")[2];
    return json(200, { user, balance: getBalance(user) });
  }
  if (req.method === "POST" && url.pathname === "/transfer") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    try {
      const result = await transfer(body.from, body.to, Number(body.amount));
      return json(200, { result });
    } catch (e) {
      return json(400, { error: String(e.message ?? e) });
    }
  }
  json(404, { error: "not found" });
});

if (process.argv[1]?.endsWith("server.js")) {
  server.listen(PORT, () => console.log(`wallet on :${PORT}`));
}
