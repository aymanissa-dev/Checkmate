# MiniShop Orders API

Simple order service for internal demos.

## Quick start

```bash
node src/server.js
# AUTH: X-User-Id: alice
curl -H 'X-User-Id: alice' http://127.0.0.1:3001/orders
```

## API

- `GET /health`
- `GET /orders` — list current user's orders
- `POST /orders` — create order `{ "item": "...", "amount": 10 }`
- `GET /orders/:id` — fetch order by id

## Tests

`node src/smoke.js` exercises the happy path.
