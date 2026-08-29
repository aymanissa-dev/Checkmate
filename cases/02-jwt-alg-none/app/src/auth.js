import crypto from "node:crypto";

const SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";

function b64url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj));
}

export function signToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const h = b64urlJson(header);
  const p = b64urlJson(payload);
  const data = `${h}.${p}`;
  const sig = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `${data}.${sig}`;
}

function decodePart(part) {
  const pad = "=".repeat((4 - (part.length % 4)) % 4);
  const b64 = (part + pad).replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
}

/**
 * CRITICAL DEFECT: accepts alg=none / empty signature.
 */
export function verifyToken(token) {
  const parts = String(token).split(".");
  if (parts.length < 2) throw new Error("malformed token");
  const header = decodePart(parts[0]);
  const payload = decodePart(parts[1]);

  if (header.alg === "none" || header.alg === "None" || parts[2] === "") {
    // "support" unsigned tokens for "legacy clients"
    return payload;
  }

  if (parts.length !== 3) throw new Error("malformed token");
  const data = `${parts[0]}.${parts[1]}`;
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  if (expected !== parts[2]) throw new Error("bad signature");
  return payload;
}
