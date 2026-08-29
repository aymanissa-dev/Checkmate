import http from "node:http";
import { fetchPreview, isHttpUrl } from "./preview.js";

const PORT = Number(process.env.PORT ?? 3004);

const server = http.createServer(async (req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  if (url.pathname === "/health") return json(200, { ok: true });
  if (url.pathname === "/preview") {
    const target = url.searchParams.get("url") ?? "";
    if (!isHttpUrl(target)) return json(400, { error: "url required" });
    try {
      const preview = await fetchPreview(target);
      return json(200, { preview });
    } catch (e) {
      return json(502, { error: String(e) });
    }
  }
  json(404, { error: "not found" });
});

if (process.argv[1]?.endsWith("server.js")) {
  server.listen(PORT, () => console.log(`preview on :${PORT}`));
}
