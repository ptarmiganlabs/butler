---
name: cluster-30
description: "Skill for the Cluster_30 area of butler. 8 symbols across 1 files."
---

# Cluster_30

8 symbols | 1 files | Cohesion: 76%

## When to Use

- Working with code in `src/`
- Understanding how onFailure, releaseExecutionId, getBackpressureThreshold work
- Modifying cluster_30-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/udp_queue_manager.js` | release, add, releaseExecutionId, getBackpressureThreshold, checkBackpressure (+3) |

## Entry Points

Start here when exploring this area:

- **`onFailure`** (Function) — `src/lib/udp_queue_manager.js:655`
- **`releaseExecutionId`** (Method) — `src/lib/udp_queue_manager.js:453`
- **`getBackpressureThreshold`** (Method) — `src/lib/udp_queue_manager.js:472`
- **`checkBackpressure`** (Method) — `src/lib/udp_queue_manager.js:482`
- **`addToQueue`** (Method) — `src/lib/udp_queue_manager.js:542`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `onFailure` | Function | `src/lib/udp_queue_manager.js` | 655 |
| `releaseExecutionId` | Method | `src/lib/udp_queue_manager.js` | 453 |
| `getBackpressureThreshold` | Method | `src/lib/udp_queue_manager.js` | 472 |
| `checkBackpressure` | Method | `src/lib/udp_queue_manager.js` | 482 |
| `addToQueue` | Method | `src/lib/udp_queue_manager.js` | 542 |
| `enqueueDeduplicated` | Method | `src/lib/udp_queue_manager.js` | 635 |
| `release` | Method | `src/lib/udp_queue_manager.js` | 120 |
| `add` | Method | `src/lib/udp_queue_manager.js` | 162 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EnqueueDeduplicated → Set` | cross_community | 6 |
| `EnqueueDeduplicated → LogDroppedMessages` | cross_community | 4 |
| `EnqueueDeduplicated → GetBackpressureThreshold` | intra_community | 4 |
| `EnqueueDeduplicated → Has` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_32 | 2 calls |
| Cluster_29 | 2 calls |

## How to Explore

1. `gitnexus_context({name: "onFailure"})` — see callers and callees
2. `gitnexus_query({query: "cluster_30"})` — find related execution flows
3. Read key files listed above for implementation details
