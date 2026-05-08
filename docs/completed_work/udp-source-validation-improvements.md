# UDP Source Validation — Improvements Ported from Butler SOS

## Overview

The existing UDP source IP validation feature (approved source hosts list) has been improved in three areas, porting refinements that were first developed in Butler SOS.

No configuration changes are required. All existing config options (`enableSourceValidation`, `allowedSources`) work exactly as before. The improvements are purely in robustness, performance, and log quality.

---

## What Was Improved

### 1. Parallel DNS Resolution

**Before:** Hostnames in `allowedSources` were resolved sequentially — one DNS lookup at a time.

**After:** All hostname lookups run in parallel via `Promise.all`. For deployments with several hostnames, startup is noticeably faster.

**File:** `src/lib/udp_ip_validator.js` — `parseAllowedSources()`

---

### 2. Partial DNS Failure Resilience

**Before:** If _any_ entry in `allowedSources` failed to resolve (hostname typo, temporary DNS outage), source validation was disabled entirely — all senders were accepted.

**After:** Only the _failed_ entries are skipped. Entries that resolve successfully are kept active. Validation remains enabled with the resolved IPs. A warning is logged listing how many entries were skipped.

Example: with `allowedSources: [192.168.1.100, bad.hostname]`, after the change, `192.168.1.100` is still enforced and `bad.hostname` is logged as a warning.

Edge case: if _all_ entries fail (e.g. complete DNS outage at startup), validation is still automatically disabled to avoid locking out everything. This matches the previous safe-fallback behavior.

**File:** `src/udp/udp_handlers.js` — startup block inside `udpInitTaskErrorServer()`

---

### 3. Throttled Rejection Logging

**Before:** Every single UDP message from an unauthorized source produced a `WARN`-level log line. A misconfigured or malicious sender could flood the log file.

**After:** The first rejection from each source IP within a 60-second rolling window is logged at `WARN` level. Subsequent rejections from the same IP within the window are logged at `DEBUG` level (effectively silenced in normal log configurations). After the window expires, the next rejection from that IP produces a `WARN` again.

Memory usage is bounded — stale IP entries are pruned from the tracking map on each warn emission.

**New export:** `createRejectThrottle(intervalMs?)` in `src/lib/udp_ip_validator.js`  
**File:** `src/udp/udp_handlers.js` — module-level `rejectThrottle` instance

---

### 4. Fail-Fast Source Check (Minor)

**Before:** Source IP validation ran _after_ payload size and rate-limit checks inside the message handler.

**After:** Source IP validation runs _first_, before payload size and rate-limit checks. Messages from unauthorized sources are dropped before any further processing — no wasted work.

**File:** `src/udp/udp_handlers.js` — message event handler

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/udp_ip_validator.js` | Parallel DNS, 3-arg `isIpAllowed`, new `createRejectThrottle` export |
| `src/udp/udp_handlers.js` | Import throttle, fail-fast order, partial-failure resilience, throttled rejection log |

---

## Configuration Reference (Unchanged)

```yaml
Butler:
  udpServerConfig:
    enableSourceValidation: false   # Set true to enable IP allow-listing
    allowedSources: []              # IPv4 addresses or hostnames (DNS-resolved at startup)
```

Behavior summary:

| Scenario | Result |
|----------|--------|
| `enableSourceValidation: false` | All sources accepted (default) |
| `enableSourceValidation: true` + populated list | Only listed IPs accepted |
| `enableSourceValidation: true` + empty list | Validation disabled, all accepted (fail-open) |
| Some entries unresolvable at startup | Resolved entries enforced; failures warned and skipped |
| All entries unresolvable at startup | Validation disabled, all accepted |
