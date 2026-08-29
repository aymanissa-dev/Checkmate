/** Tiny fake SQL engine over an in-memory table (for demo without native deps). */

const users = [
  { id: 1, name: "alice", email: "alice@example.com", role: "user" },
  { id: 2, name: "bob", email: "bob@example.com", role: "admin" },
  { id: 3, name: "carol", email: "carol@example.com", role: "user" },
];

/**
 * Extremely small SQL subset: SELECT * FROM users WHERE name = '<lit>'
 * CRITICAL DEFECT: callers build `sql` via concatenation.
 */
export function execSql(sql) {
  const m = String(sql).match(
    /^\s*SELECT\s+\*\s+FROM\s+users\s+WHERE\s+name\s*=\s*'([\s\S]*)'\s*$/i,
  );
  if (!m) throw new Error("unsupported sql");
  const lit = m[1];
  // naive: if injection breaks out of quote, "match all"
  if (lit.includes("' OR ") || lit.includes("' or ")) {
    return [...users];
  }
  return users.filter((u) => u.name === lit);
}

/** CRITICAL: concatenates user input into SQL */
export function findUsersByName(name) {
  const sql = "SELECT * FROM users WHERE name = '" + name + "'";
  return execSql(sql);
}

export function listUsers() {
  return [...users];
}
