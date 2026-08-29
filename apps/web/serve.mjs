#!/usr/bin/env node
/**
 * Static server for Checkmate product UI (apps/web).
 * Syncs comparison.json when present; sample-analysis is committed for offline demo.
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "../..");
const port = Number(process.env.PORT || 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};

async function syncComparison() {
  const src = path.join(repoRoot, "artifacts", "results", "comparison.json");
  const example = path.join(root, "data", "comparison.example.json");
  const dest = path.join(root, "data", "comparison.json");
  await fs.mkdir(path.dirname(dest), { recursive: true });
  try {
    await fs.copyFile(src, dest);
    console.log(
      `Synced ${path.relative(repoRoot, src)} → apps/web/data/comparison.json`,
    );
  } catch {
    try {
      await fs.copyFile(example, dest);
      console.log(
        "No artifacts/results yet — seeded viewer from comparison.example.json",
      );
    } catch {
      console.warn(
        "No comparison.json found. Run `pnpm evaluate` first, or open the committed example.",
      );
    }
  }
}

async function ensureSample() {
  const manifest = path.join(root, "data", "sample-analysis", "manifest.json");
  try {
    await fs.access(manifest);
    console.log("Sample analysis ready → data/sample-analysis/");
  } catch {
    console.warn("Missing data/sample-analysis/manifest.json — UI overview will fail.");
  }
}

await syncComparison();
await ensureSample();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
    let rel = decodeURIComponent(url.pathname);
    if (rel === "/") rel = "/index.html";
    // Convenience aliases
    if (rel === "/health") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true, app: "checkmate-web" }));
      return;
    }
    const filePath = path.normalize(path.join(root, rel));
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Checkmate UI → http://127.0.0.1:${port}/`);
  console.log(`  Overview / Map / Roadmap / Proofs / Changes / Eval`);
});
