import http from "node:http";
import { readPublicFile } from "./files.js";

const PORT = Number(process.env.PORT ?? 3006);

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true }));
  }
  if (url.pathname === "/download") {
    const name = url.searchParams.get("file") ?? "welcome.txt";
    try {
      const body = readPublicFile(name);
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "not found" }));
    }
  }
  res.writeHead(404);
  res.end("not found");
});

if (process.argv[1]?.endsWith("server.js")) {
  server.listen(PORT, () => console.log(`files on :${PORT}`));
}
