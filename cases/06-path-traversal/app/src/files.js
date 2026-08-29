import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, "..", "data");

/**
 * CRITICAL DEFECT: no sanitization of .. or absolute paths.
 */
export function resolveDownloadPath(filename) {
  return path.join(DATA_DIR, filename);
}

export function readPublicFile(filename) {
  const full = resolveDownloadPath(filename);
  return fs.readFileSync(full, "utf8");
}
