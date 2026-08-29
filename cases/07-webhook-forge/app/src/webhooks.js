const invoices = new Map([
  ["inv_1", { id: "inv_1", status: "open", amount: 50 }],
]);

export function getInvoice(id) {
  return invoices.get(id) ?? null;
}

/**
 * CRITICAL DEFECT: no signature / HMAC verification on webhook payloads.
 * `signature` argument is accepted but ignored.
 */
export function handleWebhook(event, _signature) {
  if (event.type === "invoice.paid") {
    const inv = invoices.get(event.invoiceId);
    if (!inv) throw new Error("unknown invoice");
    inv.status = "paid";
    return { ok: true, invoice: inv };
  }
  return { ok: true, ignored: true };
}

export { invoices };
