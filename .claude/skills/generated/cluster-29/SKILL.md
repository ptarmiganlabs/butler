---
name: cluster-29
description: "Skill for the Cluster_29 area of butler. 6 symbols across 1 files."
---

# Cluster_29

6 symbols | 1 files | Cohesion: 77%

## When to Use

- Working with code in `src/`
- Understanding how onSuccess, reserveExecutionId, markExecutionIdProcessed work
- Modifying cluster_29-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/udp_queue_manager.js` | set, reserve, markProcessed, reserveExecutionId, markExecutionIdProcessed (+1) |

## Entry Points

Start here when exploring this area:

- **`onSuccess`** (Function) — `src/lib/udp_queue_manager.js:652`
- **`reserveExecutionId`** (Method) — `src/lib/udp_queue_manager.js:430`
- **`markExecutionIdProcessed`** (Method) — `src/lib/udp_queue_manager.js:442`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `onSuccess` | Function | `src/lib/udp_queue_manager.js` | 652 |
| `reserveExecutionId` | Method | `src/lib/udp_queue_manager.js` | 430 |
| `markExecutionIdProcessed` | Method | `src/lib/udp_queue_manager.js` | 442 |
| `set` | Method | `src/lib/udp_queue_manager.js` | 80 |
| `reserve` | Method | `src/lib/udp_queue_manager.js` | 93 |
| `markProcessed` | Method | `src/lib/udp_queue_manager.js` | 110 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `EnqueueDeduplicated → Set` | cross_community | 6 |
| `EnqueueDeduplicated → Has` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Incident_mgmt | 1 calls |

## How to Explore

1. `gitnexus_context({name: "onSuccess"})` — see callers and callees
2. `gitnexus_query({query: "cluster_29"})` — find related execution flows
3. Read key files listed above for implementation details
