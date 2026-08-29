import http from "node:http";
import { echo, debugEnv, listTools } from "./tools.js";

const PORT = Number(process.env.PORT ?? 3009);

const server = http.createServer(async (req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/health") return json(200, { ok: true });
  if (url.pathname === "/tools") return json(200, { tools: listTools() });
  if (req.method === "POST" && url.pathname === "/tools/echo") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    return json(200, echo(body.text ?? ""));
  }
  if (req.method === "POST" && url.pathname === "/tools/debug_env") {
    return json(200, debugEnv());
  }
  json(404, { error: "not found" });
});

if (process.argv[1]?.endsWith("server.js")) {
  server.listen(PORT, () => console.log(`tools on :${PORT}`));
}
