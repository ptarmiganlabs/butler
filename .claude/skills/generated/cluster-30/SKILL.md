---
name: cluster-30
description: "Skill for the Cluster_30 area of butler. 4 symbols across 1 files."
---

# Cluster_30

4 symbols | 1 files | Cohesion: 60%

## When to Use

- Working with code in `src/`
- Understanding how logDroppedMessages, handleRateLimitDrop, handleSizeDrop work
- Modifying cluster_30-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/udp_queue_manager.js` | logDroppedMessages, handleRateLimitDrop, handleSizeDrop, handleDuplicateDrop |

## Entry Points

Start here when exploring this area:

- **`logDroppedMessages`** (Method) — `src/lib/udp_queue_manager.js:510`
- **`handleRateLimitDrop`** (Method) — `src/lib/udp_queue_manager.js:656`
- **`handleSizeDrop`** (Method) — `src/lib/udp_queue_manager.js:674`
- **`handleDuplicateDrop`** (Method) — `src/lib/udp_queue_manager.js:692`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `logDroppedMessages` | Method | `src/lib/udp_queue_manager.js` | 510 |
| `handleRateLimitDrop` | Method | `src/lib/udp_queue_manager.js` | 656 |
| `handleSizeDrop` | Method | `src/lib/udp_queue_manager.js` | 674 |
| `handleDuplicateDrop` | Method | `src/lib/udp_queue_manager.js` | 692 |

## How to Explore

1. `gitnexus_context({name: "logDroppedMessages"})` — see callers and callees
2. `gitnexus_query({query: "cluster_30"})` — find related execution flows
3. Read key files listed above for implementation details
