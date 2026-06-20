---
name: udp
description: "Skill for the Udp area of butler. 20 symbols across 4 files."
---

# Udp

20 symbols | 4 files | Cohesion: 77%

## When to Use

- Working with code in `src/`
- Understanding how isIPv4, parseAllowedSources, isIpAllowed work
- Modifying udp-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/udp/udp_handlers.js` | getMessageEnvelope, udpInitTaskErrorServer, validateTaskAndAppId, handleEngineReloadFailedMessage, handleSchedulerDistributeMessage (+4) |
| `src/lib/udp_ip_validator.js` | isIPv4, resolveHostname, parseAllowedSources, isIpAllowed, logRejection |
| `src/lib/udp_queue_manager.js` | checkLimit, UdpQueueManager, validateMessageSize, checkRateLimit |
| `src/lib/udp_sanitizer.js` | sanitizeField, sanitizeMessage |

## Entry Points

Start here when exploring this area:

- **`isIPv4`** (Function) — `src/lib/udp_ip_validator.js:11`
- **`parseAllowedSources`** (Function) — `src/lib/udp_ip_validator.js:46`
- **`isIpAllowed`** (Function) — `src/lib/udp_ip_validator.js:88`
- **`sanitizeField`** (Function) — `src/lib/udp_sanitizer.js:20`
- **`sanitizeMessage`** (Function) — `src/lib/udp_sanitizer.js:39`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `UdpQueueManager` | Class | `src/lib/udp_queue_manager.js` | 301 |
| `isIPv4` | Function | `src/lib/udp_ip_validator.js` | 11 |
| `parseAllowedSources` | Function | `src/lib/udp_ip_validator.js` | 46 |
| `isIpAllowed` | Function | `src/lib/udp_ip_validator.js` | 88 |
| `sanitizeField` | Function | `src/lib/udp_sanitizer.js` | 20 |
| `sanitizeMessage` | Function | `src/lib/udp_sanitizer.js` | 39 |
| `logRejection` | Method | `src/lib/udp_ip_validator.js` | 124 |
| `validateMessageSize` | Method | `src/lib/udp_queue_manager.js` | 401 |
| `checkRateLimit` | Method | `src/lib/udp_queue_manager.js` | 411 |
| `resolveHostname` | Function | `src/lib/udp_ip_validator.js` | 27 |
| `getMessageEnvelope` | Function | `src/udp/udp_handlers.js` | 64 |
| `udpInitTaskErrorServer` | Function | `src/udp/udp_handlers.js` | 241 |
| `validateTaskAndAppId` | Function | `src/udp/udp_handlers.js` | 46 |
| `handleEngineReloadFailedMessage` | Function | `src/udp/udp_handlers.js` | 82 |
| `handleSchedulerDistributeMessage` | Function | `src/udp/udp_handlers.js` | 111 |
| `handleSchedulerReloadFailedMessage` | Function | `src/udp/udp_handlers.js` | 137 |
| `handleSchedulerReloadAbortedMessage` | Function | `src/udp/udp_handlers.js` | 159 |
| `handleSchedulerTaskSuccessMessage` | Function | `src/udp/udp_handlers.js` | 181 |
| `processSanitizedUdpMessage` | Function | `src/udp/udp_handlers.js` | 204 |
| `checkLimit` | Method | `src/lib/udp_queue_manager.js` | 256 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ProcessSanitizedUdpMessage → GetQRSHttpHeaders` | cross_community | 5 |
| `ProcessSanitizedUdpMessage → QrsClient` | cross_community | 5 |
| `ProcessSanitizedUdpMessage → Get` | cross_community | 5 |
| `ProcessSanitizedUdpMessage → GetErrorMessage` | cross_community | 5 |
| `UdpInitTaskErrorServer → IsValidHost` | cross_community | 4 |
| `ProcessSanitizedUdpMessage → IsIntermediateState` | cross_community | 4 |
| `UdpInitTaskErrorServer → IsIPv4` | intra_community | 3 |
| `UdpInitTaskErrorServer → ResolveHostname` | intra_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qrs_util | 4 calls |
| Incident_mgmt | 2 calls |
| Cluster_30 | 2 calls |
| Rest_server | 1 calls |
| Qseow | 1 calls |
| Cluster_28 | 1 calls |

## How to Explore

1. `gitnexus_context({name: "isIPv4"})` — see callers and callees
2. `gitnexus_query({query: "udp"})` — find related execution flows
3. Read key files listed above for implementation details
