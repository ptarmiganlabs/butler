---
name: cluster-31
description: "Skill for the Cluster_31 area of butler. 4 symbols across 1 files."
---

# Cluster_31

4 symbols | 1 files | Cohesion: 60%

## When to Use

- Working with code in `src/`
- Understanding how logDroppedMessages, handleRateLimitDrop, handleSizeDrop work
- Modifying cluster_31-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/udp_queue_manager.js` | logDroppedMessages, handleRateLimitDrop, handleSizeDrop, handleDuplicateDrop |

## Entry Points

Start here when exploring this area:

- **`logDroppedMessages`** (Method) — `src/lib/udp_queue_manager.js:501`
- **`handleRateLimitDrop`** (Method) — `src/lib/udp_queue_manager.js:642`
- **`handleSizeDrop`** (Method) — `src/lib/udp_queue_manager.js:660`
- **`handleDuplicateDrop`** (Method) — `src/lib/udp_queue_manager.js:678`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `logDroppedMessages` | Method | `src/lib/udp_queue_manager.js` | 501 |
| `handleRateLimitDrop` | Method | `src/lib/udp_queue_manager.js` | 642 |
| `handleSizeDrop` | Method | `src/lib/udp_queue_manager.js` | 660 |
| `handleDuplicateDrop` | Method | `src/lib/udp_queue_manager.js` | 678 |

## How to Explore

1. `gitnexus_context({name: "logDroppedMessages"})` — see callers and callees
2. `gitnexus_query({query: "cluster_31"})` — find related execution flows
3. Read key files listed above for implementation details
