---
name: get
description: "Skill for the Get area of butler. 6 symbols across 1 files."
---

# Get

6 symbols | 1 files | Cohesion: 100%

## When to Use

- Working with code in `src/`
- Understanding how getMetrics work
- Modifying get-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/udp_queue_manager.js` | getValues, getPercentile95, getAverage, getMax, getCurrentRate (+1) |

## Entry Points

Start here when exploring this area:

- **`getMetrics`** (Method) — `src/lib/udp_queue_manager.js:696`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getMetrics` | Method | `src/lib/udp_queue_manager.js` | 696 |
| `getValues` | Method | `src/lib/udp_queue_manager.js` | 175 |
| `getPercentile95` | Method | `src/lib/udp_queue_manager.js` | 191 |
| `getAverage` | Method | `src/lib/udp_queue_manager.js` | 204 |
| `getMax` | Method | `src/lib/udp_queue_manager.js` | 217 |
| `getCurrentRate` | Method | `src/lib/udp_queue_manager.js` | 280 |

## How to Explore

1. `gitnexus_context({name: "getMetrics"})` — see callers and callees
2. `gitnexus_query({query: "get"})` — find related execution flows
3. Read key files listed above for implementation details
