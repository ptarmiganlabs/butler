---
name: rest-server
description: "Skill for the Rest_server area of butler. 48 symbols across 17 files."
---

# Rest_server

48 symbols | 17 files | Cohesion: 70%

## When to Use

- Working with code in `src/`
- Understanding how all, addKeyValuePair, getNamespace work
- Modifying rest_server-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/serialize_app.js` | getList, getDimensions, getMeasures, getBookmarks, getSnapshots (+3) |
| `src/routes/rest_server/sense_start_task.js` | getTaskIdAllowed, getTaskTagAllowed, getTaskCPAllowed, isTaskIdAllowed, isTaskTagAllowed (+2) |
| `src/lib/scheduler.js` | saveSchedulesToDisk, stopAllSchedules, getSchedule, stopSchedule, getAllSchedules (+2) |
| `src/routes/rest_server/key_value_store.js` | handlerPostKeyValueInNamespace, handlerGetKeyValueInNamespace, handlerKeyExists, handlerDeleteKeyValueInNamespace, handlerGetKeyList |
| `src/lib/key_value_store.js` | addKeyValuePair, getNamespace, getValue, deleteKeyValuePair |
| `src/routes/rest_server/disk_utils.js` | handlerFileCopy, handlerFileMove, handlerFileDelete, handlerCreateDirQvd |
| `src/routes/rest_server/scheduler.js` | handlerPUTSchedulesStop, handlerGETSchedules, handlerDELETESchedules |
| `src/globals.js` | getEngineHttpHeaders |
| `src/lib/qseow/winsvc.js` | all |
| `src/routes/rest_server/sense_app.js` | handlerPutAppReload |

## Entry Points

Start here when exploring this area:

- **`all`** (Function) — `src/lib/qseow/winsvc.js:42`
- **`addKeyValuePair`** (Function) — `src/lib/key_value_store.js:93`
- **`getNamespace`** (Function) — `src/lib/key_value_store.js:23`
- **`getValue`** (Function) — `src/lib/key_value_store.js:52`
- **`deleteKeyValuePair`** (Function) — `src/lib/key_value_store.js:72`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `all` | Function | `src/lib/qseow/winsvc.js` | 42 |
| `addKeyValuePair` | Function | `src/lib/key_value_store.js` | 93 |
| `getNamespace` | Function | `src/lib/key_value_store.js` | 23 |
| `getValue` | Function | `src/lib/key_value_store.js` | 52 |
| `deleteKeyValuePair` | Function | `src/lib/key_value_store.js` | 72 |
| `stopAllSchedules` | Function | `src/lib/scheduler.js` | 157 |
| `getSchedule` | Function | `src/lib/scheduler.js` | 208 |
| `stopSchedule` | Function | `src/lib/scheduler.js` | 295 |
| `getAllSchedules` | Function | `src/lib/scheduler.js` | 196 |
| `existsSchedule` | Function | `src/lib/scheduler.js` | 220 |
| `deleteSchedule` | Function | `src/lib/scheduler.js` | 238 |
| `getList` | Function | `src/lib/serialize_app.js` | 19 |
| `getDimensions` | Function | `src/lib/serialize_app.js` | 56 |
| `getMeasures` | Function | `src/lib/serialize_app.js` | 84 |
| `getBookmarks` | Function | `src/lib/serialize_app.js` | 113 |
| `getSnapshots` | Function | `src/lib/serialize_app.js` | 168 |
| `getDataConnections` | Function | `src/lib/serialize_app.js` | 217 |
| `getVariables` | Function | `src/lib/serialize_app.js` | 233 |
| `serializeApp` | Function | `src/lib/serialize_app.js` | 271 |
| `handlerPutAppReload` | Function | `src/routes/rest_server/sense_app.js` | 31 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandlerGetSenseAppDump → IsValidHost` | cross_community | 5 |
| `O → Type` | cross_community | 5 |
| `UdpInitTaskErrorServer → IsValidHost` | cross_community | 4 |
| `HandlerPutStartTask → Has` | cross_community | 3 |
| `HandlerPUTSchedulesStart → SaveSchedulesToDisk` | cross_community | 3 |
| `HandlerPUTSchedulesStop → SaveSchedulesToDisk` | intra_community | 3 |
| `HandlerPUTSchedulesStop → GetErrorMessage` | cross_community | 3 |
| `HandlerPutAppReload → GetQRSHttpHeaders` | cross_community | 3 |
| `HandlerPutAppReload → QrsClient` | cross_community | 3 |
| `HandlerPutAppReload → Post` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 14 calls |
| Incident_mgmt | 7 calls |
| Qrs_util | 4 calls |

## How to Explore

1. `gitnexus_context({name: "all"})` — see callers and callees
2. `gitnexus_query({query: "rest_server"})` — find related execution flows
3. Read key files listed above for implementation details
