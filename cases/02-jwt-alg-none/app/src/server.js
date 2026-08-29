import http from "node:http";
import { signToken, verifyToken } from "./auth.js";

const PORT = Number(process.env.PORT ?? 3002);

const server = http.createServer(async (req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  if (req.url === "/health") return json(200, { ok: true });

  if (req.method === "POST" && req.url === "/login") {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
    const token = signToken({ sub: body.user ?? "alice", role: "user" });
    return json(200, { token });
  }

  if (req.url === "/me") {
    const auth = req.headers.authorization ?? "";
    const token = auth.replace(/^Bearer\s+/i, "");
    try {
      const payload = verifyToken(token);
      return json(200, { user: payload });
    } catch {
      return json(401, { error: "invalid token" });
    }
  }

  json(404, { error: "not found" });
});

if (process.argv[1]?.endsWith("server.js")) {
  server.listen(PORT, () => console.log(`jwt demo on :${PORT}`));
}

export { server };
