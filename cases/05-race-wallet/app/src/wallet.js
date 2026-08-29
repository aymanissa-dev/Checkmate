const balances = new Map([
  ["alice", 100],
  ["bob", 50],
]);

export function getBalance(user) {
  return balances.get(user) ?? 0;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * CRITICAL DEFECT: check-then-act without atomicity / lock.
 */
export async function transfer(from, to, amount) {
  const bal = getBalance(from);
  if (bal < amount) throw new Error("insufficient funds");
  // artificial yield widens the race window
  await sleep(5);
  balances.set(from, getBalance(from) - amount);
  balances.set(to, getBalance(to) + amount);
  return { from, to, amount, fromBalance: getBalance(from), toBalance: getBalance(to) };
}

export function reset() {
  balances.set("alice", 100);
  balances.set("bob", 50);
}

export { balances };
