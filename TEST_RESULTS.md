# Test Results (npm test)

- Date: 2025-12-07 06:53:27Z (UTC)
- Command: `npm test`
- Status: ✅ 3 passed, 1 skipped, 0 failed
- Note: Database roundtrip test skipped because no `DATABASE_URL` or `PG*` environment variables were provided.

## Output
```
> bhamjobs@0.1.0 test
> node --test

﹣ database app_log roundtrip test requires DATABASE_URL or PGHOST/PGUSER/PGDATABASE env vars (0.317583ms) # SKIP
✔ normalizeThreadStatus handles various inputs (0.476667ms)
✔ formatPreview collapses whitespace and truncates (0.121083ms)
✔ formatDisplayDate formats ISO strings (47.068292ms)
ℹ tests 4
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ duration_ms 143.57225
```
