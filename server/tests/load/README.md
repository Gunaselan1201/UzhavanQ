# Load testing

Runs against a throwaway, in-memory-MongoDB-backed server on port 5001 —
never the real dev database. Three steps, three terminals (or background
the first one):

```bash
# 1. start the throwaway server (prints its Mongo URI on startup)
npm run test:load

# 2. in another terminal, run the actual load test against it
npx artillery run tests/load/morning-rush.yml

# 3. verify atomic capacity/token integrity held, using the URI step 1 printed
node tests/load/verifyCapacity.js "mongodb://127.0.0.1:<port-from-step-1>/"
```

Stop the step-1 process (Ctrl+C) when done — nothing persists, so there's
nothing to clean up.

## What morning-rush.yml simulates

Ramps 0→50 virtual users/sec over 20s, then holds ~80/sec for 20s — each
"farmer" checks slot availability, then ~70% follow through and try to
book, using randomized centre/produce/slot combinations across the next
3 days (so load concentrates on a realistic handful of popular slots
instead of either one single slot or every request being on a totally
distinct one).

A 409 (slot just filled) is an **expected, correct** outcome once a slot's
10 spots are taken under this load — it is not counted as a failure by
the scenario's `expect` block. What actually matters is verified
separately in step 3: no slot's real booking count ever exceeded 10, and
no two bookings ever received the same token.
