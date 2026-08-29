# Case 01 — Auth / IDOR

Mini order API. Happy path: list own orders and create orders works.
Critical defect: `GET /orders/:id` returns any order without checking ownership (IDOR).
