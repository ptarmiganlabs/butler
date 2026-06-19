---
name: cluster-29
description: "Skill for the Cluster_29 area of butler. 8 symbols across 1 files."
---

# Cluster_29

8 symbols | 1 files | Cohesion: 76%

## When to Use

- Working with code in `src/`
- Understanding how onFailure, releaseExecutionId, getBackpressureThreshold work
- Modifying cluster_29-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/udp_queue_manager.js` | release, add, releaseExecutionId, getBackpressureThreshold, checkBackpressure (+3) |

## Entry Points

Start here when exploring this area:

- **`onFailure`** (Function) — `src/lib/udp_queue_manager.js:624`
- **`releaseExecutionId`** (Method) — `src/lib/udp_queue_manager.js:439`
- **`getBackpressureThreshold`** (Method) — `src/lib/udp_queue_manager.js:458`
- **`checkBackpressure`** (Method) — `src/lib/udp_queue_manager.js:468`
- **`addToQueue`** (Method) — `src/lib/udp_queue_manager.js:517`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `onFailure` | Function | `src/lib/udp_queue_manager.js` | 624 |
| `releaseExecutionId` | Method | `src/lib/udp_queue_manager.js` | 439 |
| `getBackpressureThreshold` | Method | `src/lib/udp_queue_manager.js` | 458 |
| `checkBackpressure` | Method | `src/lib/udp_queue_manager.js` | 468 |
| `addToQueue` | Method | `src/lib/udp_queue_manager.js` | 517 |
| `enqueueDeduplicated` | Method | `src/lib/udp_queue_manager.js` | 609 |
| `release` | Method | `src/lib/udp_queue_manager.js` | 120 |
| `add` | Method | `src/lib/udp_queue_manager.js` | 162 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EnqueueDeduplicated → Set` | cross_community | 6 |
| `EnqueueDeduplicated → GetBackpressureThreshold` | intra_community | 4 |
| `EnqueueDeduplicated → Has` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Cluster_31 | 2 calls |
| Cluster_28 | 2 calls |

## How to Explore

1. `gitnexus_context({name: "onFailure"})` — see callers and callees
2. `gitnexus_query({query: "cluster_29"})` — find related execution flows
3. Read key files listed above for implementation details
