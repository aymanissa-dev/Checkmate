import { handleWebhook, getInvoice, invoices } from "./webhooks.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

invoices.set("inv_1", { id: "inv_1", status: "open", amount: 50 });
const result = handleWebhook(
  { type: "invoice.paid", invoiceId: "inv_1" },
  "valid-looking-sig",
);
assert(result.ok && getInvoice("inv_1")?.status === "paid", "marks paid");
console.log("smoke ok: webhook marks invoice paid");
