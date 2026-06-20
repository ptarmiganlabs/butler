---
name: cluster-27
description: "Skill for the Cluster_27 area of butler. 6 symbols across 1 files."
---

# Cluster_27

6 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how constructor work
- Modifying cluster_27-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/udp_queue_manager.js` | DeduplicationCache, startCleanup, cleanup, CircularBuffer, RateLimiter (+1) |

## Entry Points

Start here when exploring this area:

- **`constructor`** (Method) — `src/lib/udp_queue_manager.js:320`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `constructor` | Method | `src/lib/udp_queue_manager.js` | 320 |
| `DeduplicationCache` | Class | `src/lib/udp_queue_manager.js` | 16 |
| `CircularBuffer` | Class | `src/lib/udp_queue_manager.js` | 144 |
| `RateLimiter` | Class | `src/lib/udp_queue_manager.js` | 239 |
| `startCleanup` | Method | `src/lib/udp_queue_manager.js` | 31 |
| `cleanup` | Method | `src/lib/udp_queue_manager.js` | 50 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Constructor → Cleanup` | intra_community | 3 |

## How to Explore

1. `gitnexus_context({name: "constructor"})` — see callers and callees
2. `gitnexus_query({query: "cluster_27"})` — find related execution flows
3. Read key files listed above for implementation details
