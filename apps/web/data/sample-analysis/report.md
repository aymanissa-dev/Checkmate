# Checkmate report — 01-auth-idor (sample)

## Mode
**MOCK / SAMPLE** — committed offline demo for the product UI. Not live model CDR.

## Stages completed
- scope ✓
- understand ✓
- model ✓
- hypothesize ✓
- verify ✓
- report ✓

## Ship status
**Blocked** — critical IDOR (F1) confirmed with sandbox proof. Do not ship until ownership check lands on `getOrder` / `GET /orders/:id`.

## Top priorities
1. Fix ownership check on detail (F1 / P1)
2. Add cross-user denial to smoke (F2 / P2)
3. Document authn model if this leaves the mini-app context (F3)

## Next best action
Patch `getOrder` to compare `order.userId` to the authenticated uid and return 404/403 on mismatch; extend smoke with alice→bob detail denial.
