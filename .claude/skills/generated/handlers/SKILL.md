---
name: handlers
description: "Skill for the Handlers area of butler. 6 symbols across 1 files."
---

# Handlers

6 symbols | 1 files | Cohesion: 71%

## When to Use

- Working with code in `src/`
- Understanding how startPolling, stopPolling, checkQueue work
- Modifying handlers-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/udp/handlers/distribution_queue.js` | startPolling, stopPolling, checkQueue, isFinalState, processCompletedTask (+1) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `startPolling` | Method | `src/udp/handlers/distribution_queue.js` | 65 |
| `stopPolling` | Method | `src/udp/handlers/distribution_queue.js` | 84 |
| `checkQueue` | Method | `src/udp/handlers/distribution_queue.js` | 96 |
| `isFinalState` | Method | `src/udp/handlers/distribution_queue.js` | 179 |
| `processCompletedTask` | Method | `src/udp/handlers/distribution_queue.js` | 203 |
| `clear` | Method | `src/udp/handlers/distribution_queue.js` | 255 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DistributionEnded → GetQRSHttpHeaders` | cross_community | 6 |
| `DistributionEnded → QrsClient` | cross_community | 6 |
| `DistributeTaskCompletion → GetQRSHttpHeaders` | cross_community | 6 |
| `DistributeTaskCompletion → QrsClient` | cross_community | 6 |
| `DistributionEnded → StopPolling` | cross_community | 5 |
| `DistributionEnded → IsFinalState` | cross_community | 5 |
| `DistributeTaskCompletion → StopPolling` | cross_community | 5 |
| `DistributeTaskCompletion → IsFinalState` | cross_community | 5 |
| `CheckQueue → Get` | cross_community | 3 |
| `CheckQueue → GetErrorMessage` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 2 calls |
| Qrs_util | 1 calls |

## How to Explore

1. `gitnexus_context({name: "startPolling"})` — see callers and callees
2. `gitnexus_query({query: "handlers"})` — find related execution flows
3. Read key files listed above for implementation details
