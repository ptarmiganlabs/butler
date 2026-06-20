---
name: get
description: "Skill for the Get area of butler. 7 symbols across 1 files."
---

# Get

7 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how getDeduplicationCacheSize, getMetrics work
- Modifying get-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/udp_queue_manager.js` | getValues, getPercentile95, getAverage, getMax, getCurrentRate (+2) |

## Entry Points

Start here when exploring this area:

- **`getDeduplicationCacheSize`** (Method) — `src/lib/udp_queue_manager.js:463`
- **`getMetrics`** (Method) — `src/lib/udp_queue_manager.js:745`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getDeduplicationCacheSize` | Method | `src/lib/udp_queue_manager.js` | 463 |
| `getMetrics` | Method | `src/lib/udp_queue_manager.js` | 745 |
| `getValues` | Method | `src/lib/udp_queue_manager.js` | 175 |
| `getPercentile95` | Method | `src/lib/udp_queue_manager.js` | 191 |
| `getAverage` | Method | `src/lib/udp_queue_manager.js` | 204 |
| `getMax` | Method | `src/lib/udp_queue_manager.js` | 217 |
| `getCurrentRate` | Method | `src/lib/udp_queue_manager.js` | 280 |

## How to Explore

1. `gitnexus_context({name: "getDeduplicationCacheSize"})` — see callers and callees
2. `gitnexus_query({query: "get"})` — find related execution flows
3. Read key files listed above for implementation details
