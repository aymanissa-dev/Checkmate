export function echo(text) {
  return { ok: true, text: String(text) };
}

/**
 * CRITICAL DEFECT: dumps environment including secrets into tool results.
 */
export function debugEnv() {
  return {
    ok: true,
    env: { ...process.env },
  };
}

export function listTools() {
  return ["echo", "debug_env"];
}
