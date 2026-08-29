/**
 * Case-specific fixture content for mock/dry-run Checkmate.
 * Harness smoke only — NOT real model evaluation results.
 */
import type {
  DefectClass,
  Finding,
  Hypothesis,
  Severity,
} from "@checkmate/schemas";

export interface CaseFixture {
  title: string;
  summary: string;
  components: string[];
  trustBoundaries: string[];
  dataStores: string[];
  entryPoints: string[];
  readPaths: string[];
  searchPattern: string;
  hypothesis: Omit<Hypothesis, "schemaVersion" | "status" | "proofIds">;
  finding: Omit<
    Finding,
    "schemaVersion" | "proofIds" | "verificationStatus" | "confidence"
  >;
}

const base = (
  partial: CaseFixture,
): CaseFixture => partial;

export const CASE_FIXTURES: Record<string, CaseFixture> = {
  "01-auth-idor": base({
    title: "Order API",
    summary: "HTTP order service with user-scoped orders and lookup by id.",
    components: ["src/server.js", "order store"],
    trustBoundaries: ["authenticated HTTP caller → order detail"],
    dataStores: ["in-memory orders"],
    entryPoints: ["GET /orders/:id"],
    readPaths: ["src/server.js", "package.json", "README.md"],
    searchPattern: "orders|userId|getOrder|authorization",
    hypothesis: {
      id: "H1",
      claim:
        "Order detail lookup may return any order without verifying ownership.",
      defectClass: "authz" as DefectClass,
      tentativeSeverity: "critical" as Severity,
      relatedComponents: ["src/server.js"],
      proposedCheck:
        "read_file src/server.js and confirm absence of ownership check on getOrder",
    },
    finding: {
      id: "F1",
      title: "IDOR: order lookup missing ownership check",
      severity: "critical",
      defectClass: "authz",
      description:
        "GET /orders/:id returns any order without verifying the caller owns it.",
      locators: [{ path: "src/server.js" }],
      matchKeys: ["idor", "missing authorization", "orders"],
    },
  }),
  "02-jwt-alg-none": base({
    title: "JWT auth service",
    summary: "Token verification for API auth.",
    components: ["src/auth.js", "src/server.js"],
    trustBoundaries: ["bearer token → claims"],
    dataStores: [],
    entryPoints: ["Authorization header"],
    readPaths: ["src/auth.js", "src/server.js", "package.json"],
    searchPattern: "jwt|alg|none|verify",
    hypothesis: {
      id: "H1",
      claim: "JWT verifier may accept alg=none unsigned tokens.",
      defectClass: "authn",
      tentativeSeverity: "critical",
      relatedComponents: ["src/auth.js"],
      proposedCheck: "read_file src/auth.js for alg none / missing signature check",
    },
    finding: {
      id: "F1",
      title: "JWT alg=none accepted",
      severity: "critical",
      defectClass: "authn",
      description: "Token verification accepts unsigned alg=none JWTs.",
      locators: [{ path: "src/auth.js" }],
      matchKeys: ["jwt", "alg none", "unsigned"],
    },
  }),
  "03-sql-concat": base({
    title: "SQL query helper",
    summary: "DB access layer building queries from user input.",
    components: ["src/db.js", "src/server.js"],
    trustBoundaries: ["HTTP params → SQL"],
    dataStores: ["sqlite/memory"],
    entryPoints: ["search/query endpoints"],
    readPaths: ["src/db.js", "src/server.js", "package.json"],
    searchPattern: "SELECT|concat|query|WHERE",
    hypothesis: {
      id: "H1",
      claim: "User input may be concatenated into SQL strings.",
      defectClass: "injection",
      tentativeSeverity: "critical",
      relatedComponents: ["src/db.js"],
      proposedCheck: "read_file src/db.js for string concatenation into queries",
    },
    finding: {
      id: "F1",
      title: "SQL injection via string concatenation",
      severity: "critical",
      defectClass: "injection",
      description: "User input concatenated into SQL WHERE clause.",
      locators: [{ path: "src/db.js" }],
      matchKeys: ["sql injection", "concat", "query"],
    },
  }),
  "04-ssrf-preview": base({
    title: "Link preview fetcher",
    summary: "Server-side URL fetch for previews.",
    components: ["src/preview.js", "src/server.js"],
    trustBoundaries: ["user URL → server fetch"],
    dataStores: [],
    entryPoints: ["preview endpoint"],
    readPaths: ["src/preview.js", "src/server.js", "package.json"],
    searchPattern: "fetch|url|http|preview",
    hypothesis: {
      id: "H1",
      claim: "Preview fetcher may request arbitrary URLs (SSRF).",
      defectClass: "ssrf",
      tentativeSeverity: "critical",
      relatedComponents: ["src/preview.js"],
      proposedCheck: "read_file src/preview.js for missing URL allowlist",
    },
    finding: {
      id: "F1",
      title: "SSRF in link preview fetcher",
      severity: "critical",
      defectClass: "ssrf",
      description: "Server fetches arbitrary user-supplied URLs without allowlist.",
      locators: [{ path: "src/preview.js" }],
      matchKeys: ["ssrf", "fetch", "url"],
    },
  }),
  "05-race-wallet": base({
    title: "Wallet transfer",
    summary: "Balance transfer between accounts.",
    components: ["src/wallet.js", "src/server.js"],
    trustBoundaries: ["transfer API → balances"],
    dataStores: ["balances map"],
    entryPoints: ["transfer"],
    readPaths: ["src/wallet.js", "src/server.js", "package.json"],
    searchPattern: "transfer|balance|lock|atomic",
    hypothesis: {
      id: "H1",
      claim: "Transfer check-then-debit may race under concurrency.",
      defectClass: "race",
      tentativeSeverity: "critical",
      relatedComponents: ["src/wallet.js"],
      proposedCheck: "read_file src/wallet.js for non-atomic balance update",
    },
    finding: {
      id: "F1",
      title: "Non-atomic wallet transfer (TOCTOU)",
      severity: "critical",
      defectClass: "race",
      description: "Balance check and debit are not atomic under concurrency.",
      locators: [{ path: "src/wallet.js" }],
      matchKeys: ["race", "toctou", "transfer", "non-atomic"],
    },
  }),
  "06-path-traversal": base({
    title: "File download",
    summary: "Serves files by user-supplied name.",
    components: ["src/files.js", "src/server.js"],
    trustBoundaries: ["filename param → filesystem"],
    dataStores: ["files dir"],
    entryPoints: ["download"],
    readPaths: ["src/files.js", "src/server.js", "package.json"],
    searchPattern: "path|join|filename|\\.\\.",
    hypothesis: {
      id: "H1",
      claim: "Filename may allow path traversal outside intended directory.",
      defectClass: "path-traversal",
      tentativeSeverity: "critical",
      relatedComponents: ["src/files.js"],
      proposedCheck: "read_file src/files.js for unsanitized path join",
    },
    finding: {
      id: "F1",
      title: "Path traversal in file download",
      severity: "critical",
      defectClass: "path-traversal",
      description: "User-controlled filename joined without sanitization.",
      locators: [{ path: "src/files.js" }],
      matchKeys: ["path traversal", "dotdot", "filename"],
    },
  }),
  "07-webhook-forge": base({
    title: "Webhook receiver",
    summary: "Accepts inbound webhook events.",
    components: ["src/webhooks.js", "src/server.js"],
    trustBoundaries: ["external POST → business events"],
    dataStores: ["event log"],
    entryPoints: ["POST /webhooks"],
    readPaths: ["src/webhooks.js", "src/server.js", "package.json"],
    searchPattern: "webhook|signature|hmac|secret",
    hypothesis: {
      id: "H1",
      claim: "Webhook handler may lack signature verification.",
      defectClass: "integrity",
      tentativeSeverity: "critical",
      relatedComponents: ["src/webhooks.js"],
      proposedCheck: "read_file src/webhooks.js for missing HMAC/signature check",
    },
    finding: {
      id: "F1",
      title: "Webhook endpoint missing signature verification",
      severity: "critical",
      defectClass: "integrity",
      description: "Any client can POST forged webhook events.",
      locators: [{ path: "src/webhooks.js" }],
      matchKeys: ["webhook", "signature", "hmac"],
    },
  }),
  "08-false-green-tests": base({
    title: "Orders with tests",
    summary: "Persistence layer covered by unit tests that may over-mock.",
    components: ["src/store.js", "test/orders.test.js"],
    trustBoundaries: ["tests → store"],
    dataStores: ["orders store"],
    entryPoints: ["store APIs"],
    readPaths: ["test/orders.test.js", "src/store.js", "package.json"],
    searchPattern: "mock|stub|persist|test",
    hypothesis: {
      id: "H1",
      claim: "Tests may mock persistence so real bugs stay green.",
      defectClass: "test-gap",
      tentativeSeverity: "high",
      relatedComponents: ["test/orders.test.js"],
      proposedCheck: "read_file test/orders.test.js for stubbed repository",
    },
    finding: {
      id: "F1",
      title: "Tests mock away real persistence",
      severity: "high",
      defectClass: "test-gap",
      description:
        "Unit tests stub the repository so persistence bugs never fail CI.",
      locators: [{ path: "test/orders.test.js" }],
      matchKeys: ["mock", "false green", "persistence"],
    },
  }),
  "09-prompt-leak-tool": base({
    title: "Agent tool host",
    summary: "Exposes tools to a model including env introspection.",
    components: ["src/tools.js", "src/server.js"],
    trustBoundaries: ["model tool call → host env"],
    dataStores: [],
    entryPoints: ["debug_env tool"],
    readPaths: ["src/tools.js", "src/server.js", "package.json"],
    searchPattern: "env|secret|api|key|debug",
    hypothesis: {
      id: "H1",
      claim: "debug_env tool may leak secrets from environment.",
      defectClass: "secret-leak",
      tentativeSeverity: "critical",
      relatedComponents: ["src/tools.js"],
      proposedCheck: "read_file src/tools.js for env dumping",
    },
    finding: {
      id: "F1",
      title: "Tool echoes secrets from environment",
      severity: "critical",
      defectClass: "secret-leak",
      description: "debug_env tool returns API keys / secrets to the model.",
      locators: [{ path: "src/tools.js" }],
      matchKeys: ["secret", "env", "leak", "api key"],
    },
  }),
  "10-challenge-eventual": base({
    title: "Checkout / inventory",
    summary: "Checkout decrements inventory for SKUs.",
    components: ["src/checkout.js", "src/server.js"],
    trustBoundaries: ["checkout → inventory counts"],
    dataStores: ["inventory"],
    entryPoints: ["checkout"],
    readPaths: ["src/checkout.js", "src/server.js", "package.json"],
    searchPattern: "inventory|checkout|stock|concurrent",
    hypothesis: {
      id: "H1",
      claim: "Concurrent checkouts may oversell the same SKU.",
      defectClass: "consistency",
      tentativeSeverity: "critical",
      relatedComponents: ["src/checkout.js"],
      proposedCheck: "read_file src/checkout.js for non-atomic inventory update",
    },
    finding: {
      id: "F1",
      title: "Concurrent checkout breaks inventory invariant",
      severity: "critical",
      defectClass: "consistency",
      description: "Two checkouts can oversell the same SKU under concurrency.",
      locators: [{ path: "src/checkout.js" }],
      matchKeys: ["inventory", "concurrent", "oversell", "invariant"],
    },
  }),
};

export function getCaseFixture(caseId: string): CaseFixture {
  return (
    CASE_FIXTURES[caseId] ?? {
      title: "Unknown app",
      summary: "Mock fixture fallback — NOT a real eval.",
      components: [],
      trustBoundaries: [],
      dataStores: [],
      entryPoints: [],
      readPaths: ["package.json"],
      searchPattern: "TODO|FIXME",
      hypothesis: {
        id: "H1",
        claim: "Unresolved review (mock stub)",
        defectClass: "other",
        tentativeSeverity: "medium",
        relatedComponents: [],
        proposedCheck: "list_files and read README",
      },
      finding: {
        id: "F1",
        title: "Unresolved review (mock stub)",
        severity: "medium",
        defectClass: "other",
        description:
          "Mock provider has no fixture findings for this caseId. NOT a real eval.",
        locators: [],
        matchKeys: ["stub"],
      },
    }
  );
}
