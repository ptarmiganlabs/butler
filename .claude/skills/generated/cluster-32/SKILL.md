---
name: cluster-32
description: "Skill for the Cluster_32 area of butler. 5 symbols across 1 files."
---

# Cluster_32

5 symbols | 1 files | Cohesion: 67%

## When to Use

- Working with code in `src/`
- Understanding how logDroppedMessages, handleQueueFullDrop, handleRateLimitDrop work
- Modifying cluster_32-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/udp_queue_manager.js` | logDroppedMessages, handleQueueFullDrop, handleRateLimitDrop, handleSizeDrop, handleDuplicateDrop |

## Entry Points

Start here when exploring this area:

- **`logDroppedMessages`** (Method) — `src/lib/udp_queue_manager.js:515`
- **`handleQueueFullDrop`** (Method) — `src/lib/udp_queue_manager.js:673`
- **`handleRateLimitDrop`** (Method) — `src/lib/udp_queue_manager.js:691`
- **`handleSizeDrop`** (Method) — `src/lib/udp_queue_manager.js:709`
- **`handleDuplicateDrop`** (Method) — `src/lib/udp_queue_manager.js:727`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `logDroppedMessages` | Method | `src/lib/udp_queue_manager.js` | 515 |
| `handleQueueFullDrop` | Method | `src/lib/udp_queue_manager.js` | 673 |
| `handleRateLimitDrop` | Method | `src/lib/udp_queue_manager.js` | 691 |
| `handleSizeDrop` | Method | `src/lib/udp_queue_manager.js` | 709 |
| `handleDuplicateDrop` | Method | `src/lib/udp_queue_manager.js` | 727 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EnqueueDeduplicated → LogDroppedMessages` | cross_community | 4 |

## How to Explore

1. `gitnexus_context({name: "logDroppedMessages"})` — see callers and callees
2. `gitnexus_query({query: "cluster_32"})` — find related execution flows
3. Read key files listed above for implementation details
