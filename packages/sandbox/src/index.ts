import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import type { ToolName } from "@checkmate/schemas";

export interface SandboxOptions {
  /** Absolute path to the case app root (agent-visible workspace). */
  workspaceRoot: string;
  /** Absolute paths that must never be readable (e.g. truth.json parent dirs). */
  deniedPathFragments?: string[];
  defaultTimeoutMs?: number;
  maxOutputBytes?: number;
}

export interface RunCommandResult {
  ok: boolean;
  exitCode: number | null;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  cwd: string;
  error?: string;
}

export interface ToolContext {
  sandbox: CaseSandbox;
}

const DEFAULT_DENIED = [
  "truth.json",
  `${path.sep}truth.json`,
  "/truth.json",
];

const BLOCKED_COMMAND_PATTERNS: RegExp[] = [
  /\brm\s+(-[^\s]*f[^\s]*\s+)?\//i,
  /\bcurl\b.*\bfile:\/\//i,
  /\bwget\b.*\bfile:\/\//i,
  /\bchmod\b.*\b777\b/i,
];

function normalizeWithinRoot(root: string, relativeOrAbs: string): string {
  const rootResolved = path.resolve(root);
  const candidate = path.isAbsolute(relativeOrAbs)
    ? path.resolve(relativeOrAbs)
    : path.resolve(rootResolved, relativeOrAbs);
  const rel = path.relative(rootResolved, candidate);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    throw new Error(`Path escapes workspace root: ${relativeOrAbs}`);
  }
  return candidate;
}

function containsDeniedFragment(
  targetPath: string,
  denied: string[],
): boolean {
  const normalized = targetPath.replace(/\\/g, "/").toLowerCase();
  return denied.some((frag) => {
    const f = frag.replace(/\\/g, "/").toLowerCase();
    return normalized.includes(f) || normalized.endsWith(f.replace(/^\//, ""));
  });
}

/**
 * Restricted workspace tools for baseline and Checkmate.
 * Ground truth (truth.json) is never in the workspace root.
 */
export class CaseSandbox {
  readonly workspaceRoot: string;
  readonly deniedPathFragments: string[];
  readonly defaultTimeoutMs: number;
  readonly maxOutputBytes: number;

  constructor(opts: SandboxOptions) {
    this.workspaceRoot = path.resolve(opts.workspaceRoot);
    this.deniedPathFragments = [
      ...DEFAULT_DENIED,
      ...(opts.deniedPathFragments ?? []),
    ];
    this.defaultTimeoutMs = opts.defaultTimeoutMs ?? 15_000;
    this.maxOutputBytes = opts.maxOutputBytes ?? 200_000;
  }

  assertSafePath(relativeOrAbs: string): string {
    const resolved = normalizeWithinRoot(this.workspaceRoot, relativeOrAbs);
    if (containsDeniedFragment(resolved, this.deniedPathFragments)) {
      throw new Error(`Access denied to protected path: ${relativeOrAbs}`);
    }
    return resolved;
  }

  async list_files(relativeDir = "."): Promise<string[]> {
    const dir = this.assertSafePath(relativeDir);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const out: string[] = [];
    for (const ent of entries) {
      const rel = path.relative(
        this.workspaceRoot,
        path.join(dir, ent.name),
      );
      if (containsDeniedFragment(rel, this.deniedPathFragments)) continue;
      out.push(ent.isDirectory() ? `${rel}/` : rel);
    }
    return out.sort();
  }

  async read_file(relativePath: string, maxBytes = 80_000): Promise<string> {
    const file = this.assertSafePath(relativePath);
    const stat = await fs.stat(file);
    if (!stat.isFile()) {
      throw new Error(`Not a file: ${relativePath}`);
    }
    const buf = await fs.readFile(file);
    const slice = buf.subarray(0, Math.min(buf.length, maxBytes));
    return slice.toString("utf8");
  }

  async search(
    pattern: string,
    relativeDir = ".",
  ): Promise<Array<{ path: string; line: number; text: string }>> {
    if (!pattern || pattern.length > 200) {
      throw new Error("Invalid search pattern");
    }
    const root = this.assertSafePath(relativeDir);
    const results: Array<{ path: string; line: number; text: string }> = [];
    const needle = pattern.toLowerCase();

    async function walk(dir: string, sandbox: CaseSandbox): Promise<void> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        const rel = path.relative(sandbox.workspaceRoot, full);
        if (containsDeniedFragment(rel, sandbox.deniedPathFragments)) continue;
        if (ent.name === "node_modules" || ent.name === ".git") continue;
        if (ent.isDirectory()) {
          await walk(full, sandbox);
          continue;
        }
        if (!/\.(ts|js|mjs|cjs|json|md|txt|yml|yaml)$/i.test(ent.name)) {
          continue;
        }
        let content: string;
        try {
          content = await fs.readFile(full, "utf8");
        } catch {
          continue;
        }
        const lines = content.split(/\r?\n/);
        lines.forEach((text, i) => {
          if (text.toLowerCase().includes(needle) && results.length < 100) {
            results.push({ path: rel, line: i + 1, text: text.slice(0, 240) });
          }
        });
      }
    }

    await walk(root, this);
    return results;
  }

  async run_command(
    command: string,
    opts?: { cwd?: string; timeoutMs?: number },
  ): Promise<RunCommandResult> {
    if (!command || command.length > 2_000) {
      return {
        ok: false,
        exitCode: null,
        timedOut: false,
        stdout: "",
        stderr: "",
        cwd: this.workspaceRoot,
        error: "Invalid command",
      };
    }
    for (const re of BLOCKED_COMMAND_PATTERNS) {
      if (re.test(command)) {
        return {
          ok: false,
          exitCode: null,
          timedOut: false,
          stdout: "",
          stderr: "",
          cwd: this.workspaceRoot,
          error: "Command blocked by sandbox policy",
        };
      }
    }

    // Soft block: refuse if command text clearly targets truth.json
    if (/truth\.json/i.test(command)) {
      return {
        ok: false,
        exitCode: null,
        timedOut: false,
        stdout: "",
        stderr: "",
        cwd: this.workspaceRoot,
        error: "Command blocked: must not access ground truth",
      };
    }

    let cwd = this.workspaceRoot;
    try {
      cwd = this.assertSafePath(opts?.cwd ?? ".");
    } catch (err) {
      return {
        ok: false,
        exitCode: null,
        timedOut: false,
        stdout: "",
        stderr: "",
        cwd: this.workspaceRoot,
        error: err instanceof Error ? err.message : String(err),
      };
    }

    const timeoutMs = opts?.timeoutMs ?? this.defaultTimeoutMs;

    return new Promise((resolve) => {
      const child = spawn("/bin/bash", ["-lc", command], {
        cwd,
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          LANG: process.env.LANG ?? "C.UTF-8",
          NODE_ENV: "development",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill("SIGKILL");
      }, timeoutMs);

      const append = (buf: Buffer, which: "out" | "err") => {
        const chunk = buf.toString("utf8");
        if (which === "out") {
          stdout += chunk;
          if (stdout.length > this.maxOutputBytes) {
            stdout = stdout.slice(0, this.maxOutputBytes) + "\n…[truncated]";
          }
        } else {
          stderr += chunk;
          if (stderr.length > this.maxOutputBytes) {
            stderr = stderr.slice(0, this.maxOutputBytes) + "\n…[truncated]";
          }
        }
      };

      child.stdout?.on("data", (b: Buffer) => append(b, "out"));
      child.stderr?.on("data", (b: Buffer) => append(b, "err"));

      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          ok: !timedOut && code === 0,
          exitCode: code,
          timedOut,
          stdout,
          stderr,
          cwd,
        });
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          ok: false,
          exitCode: null,
          timedOut,
          stdout,
          stderr,
          cwd,
          error: err.message,
        });
      });
    });
  }

  async invokeTool(
    name: ToolName,
    args: Record<string, unknown>,
  ): Promise<string> {
    switch (name) {
      case "list_files": {
        const dir = typeof args.path === "string" ? args.path : ".";
        const files = await this.list_files(dir);
        return JSON.stringify({ path: dir, files }, null, 2);
      }
      case "read_file": {
        const p = String(args.path ?? "");
        const content = await this.read_file(p);
        return content;
      }
      case "search": {
        const pattern = String(args.pattern ?? args.query ?? "");
        const dir = typeof args.path === "string" ? args.path : ".";
        const hits = await this.search(pattern, dir);
        return JSON.stringify({ pattern, hits }, null, 2);
      }
      case "run_command": {
        const command = String(args.command ?? "");
        const cwd = typeof args.cwd === "string" ? args.cwd : undefined;
        const result = await this.run_command(command, { cwd });
        return JSON.stringify(result, null, 2);
      }
      default: {
        const _exhaustive: never = name;
        return `Unknown tool: ${_exhaustive}`;
      }
    }
  }
}

export function createCaseSandbox(opts: SandboxOptions): CaseSandbox {
  return new CaseSandbox(opts);
}
