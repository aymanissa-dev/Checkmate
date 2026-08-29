import type { ModelAction, ModelProvider, ChatMessage, ToolSpec } from "./provider.js";

/**
 * Offline fixture provider for harness tests.
 * Explores the case app with a fixed tool plan, then emits findings that
 * match the known defect classes for the caseId when a fixture map exists.
 *
 * This is NOT a real evaluation result — scores from mock mode must be
 * labeled as harness-smoke only, never as model performance.
 */
export class MockModelProvider implements ModelProvider {
  readonly name = "mock";
  readonly model = "fixture-v1";

  constructor(private readonly caseId: string) {}

  async nextAction(input: {
    messages: ChatMessage[];
    tools: ToolSpec[];
    step: number;
  }): Promise<ModelAction> {
    const step = input.step;
    if (step === 0) {
      return {
        type: "tool_call",
        toolName: "list_files",
        toolArgs: { path: "." },
        assistantText: "[mock] Listing workspace root",
      };
    }
    if (step === 1) {
      return {
        type: "tool_call",
        toolName: "search",
        toolArgs: { pattern: "TODO|FIXME|password|token|SELECT|jwt|fetch|transfer" },
        assistantText: "[mock] Searching for risk keywords",
      };
    }
    if (step === 2) {
      return {
        type: "tool_call",
        toolName: "list_files",
        toolArgs: { path: "src" },
        assistantText: "[mock] Listing src/",
      };
    }
    // Final structured findings from case-specific fixture map
    return {
      type: "final",
      assistantText: "[mock] Emitting fixture findings (NOT a real model eval)",
      findingsJson: JSON.stringify(
        {
          schemaVersion: 1,
          caseId: this.caseId,
          producedBy: "fixture",
          findings: fixtureFindings(this.caseId),
        },
        null,
        2,
      ),
    };
  }
}

function fixtureFindings(caseId: string) {
  const map: Record<
    string,
    Array<{
      schemaVersion: 1;
      id: string;
      title: string;
      severity: "critical" | "high" | "medium";
      defectClass:
        | "authz"
        | "authn"
        | "injection"
        | "ssrf"
        | "race"
        | "path-traversal"
        | "integrity"
        | "test-gap"
        | "secret-leak"
        | "consistency"
        | "other";
      description: string;
      locators: Array<{ path: string }>;
      matchKeys: string[];
      proofIds: string[];
    }>
  > = {
    "01-auth-idor": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "IDOR: order lookup missing ownership check",
        severity: "critical",
        defectClass: "authz",
        description:
          "GET /orders/:id returns any order without verifying the caller owns it.",
        locators: [{ path: "src/server.js" }],
        matchKeys: ["idor", "missing authorization", "orders"],
        proofIds: [],
      },
    ],
    "02-jwt-alg-none": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "JWT alg=none accepted",
        severity: "critical",
        defectClass: "authn",
        description: "Token verification accepts unsigned alg=none JWTs.",
        locators: [{ path: "src/auth.js" }],
        matchKeys: ["jwt", "alg none", "unsigned"],
        proofIds: [],
      },
    ],
    "03-sql-concat": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "SQL injection via string concatenation",
        severity: "critical",
        defectClass: "injection",
        description: "User input concatenated into SQL WHERE clause.",
        locators: [{ path: "src/db.js" }],
        matchKeys: ["sql injection", "concat", "query"],
        proofIds: [],
      },
    ],
    "04-ssrf-preview": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "SSRF in link preview fetcher",
        severity: "critical",
        defectClass: "ssrf",
        description: "Server fetches arbitrary user-supplied URLs without allowlist.",
        locators: [{ path: "src/preview.js" }],
        matchKeys: ["ssrf", "fetch", "url"],
        proofIds: [],
      },
    ],
    "05-race-wallet": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "Non-atomic wallet transfer (TOCTOU)",
        severity: "critical",
        defectClass: "race",
        description: "Balance check and debit are not atomic under concurrency.",
        locators: [{ path: "src/wallet.js" }],
        matchKeys: ["race", "toctou", "transfer", "non-atomic"],
        proofIds: [],
      },
    ],
    "06-path-traversal": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "Path traversal in file download",
        severity: "critical",
        defectClass: "path-traversal",
        description: "User-controlled filename joined without sanitization.",
        locators: [{ path: "src/files.js" }],
        matchKeys: ["path traversal", "dotdot", "filename"],
        proofIds: [],
      },
    ],
    "07-webhook-forge": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "Webhook endpoint missing signature verification",
        severity: "critical",
        defectClass: "integrity",
        description: "Any client can POST forged webhook events.",
        locators: [{ path: "src/webhooks.js" }],
        matchKeys: ["webhook", "signature", "hmac"],
        proofIds: [],
      },
    ],
    "08-false-green-tests": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "Tests mock away real persistence",
        severity: "high",
        defectClass: "test-gap",
        description:
          "Unit tests stub the repository so persistence bugs never fail CI.",
        locators: [{ path: "test/orders.test.js" }],
        matchKeys: ["mock", "false green", "persistence"],
        proofIds: [],
      },
    ],
    "09-prompt-leak-tool": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "Tool echoes secrets from environment",
        severity: "critical",
        defectClass: "secret-leak",
        description: "debug_env tool returns API keys / secrets to the model.",
        locators: [{ path: "src/tools.js" }],
        matchKeys: ["secret", "env", "leak", "api key"],
        proofIds: [],
      },
    ],
    "10-challenge-eventual": [
      {
        schemaVersion: 1,
        id: "F1",
        title: "Concurrent checkout breaks inventory invariant",
        severity: "critical",
        defectClass: "consistency",
        description:
          "Two checkouts can oversell the same SKU under concurrency.",
        locators: [{ path: "src/checkout.js" }],
        matchKeys: ["inventory", "concurrent", "oversell", "invariant"],
        proofIds: [],
      },
    ],
  };

  return (
    map[caseId] ?? [
      {
        schemaVersion: 1 as const,
        id: "F1",
        title: "Unresolved review (mock stub)",
        severity: "medium" as const,
        defectClass: "other" as const,
        description:
          "Mock provider has no fixture findings for this caseId. NOT a real eval.",
        locators: [],
        matchKeys: ["stub"],
        proofIds: [],
      },
    ]
  );
}
