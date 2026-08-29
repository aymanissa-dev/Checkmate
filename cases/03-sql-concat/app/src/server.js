import http from "node:http";
import { findUsersByName, listUsers } from "./db.js";

const PORT = Number(process.env.PORT ?? 3003);

const server = http.createServer((req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/health") return json(200, { ok: true });
  if (url.pathname === "/users") return json(200, { users: listUsers() });
  if (url.pathname === "/users/search") {
    const q = url.searchParams.get("name") ?? "";
    return json(200, { users: findUsersByName(q) });
  }
  json(404, { error: "not found" });
});

if (process.argv[1]?.endsWith("server.js")) {
  server.listen(PORT, () => console.log(`sql demo on :${PORT}`));
}
