---
name: configvis
description: "Skill for the Configvis area of butler. 137 symbols across 5 files."
---

# Configvis

137 symbols | 5 files | Cohesion: 70%

## When to Use

- Working with code in `static/`
- Understanding how addSchedule, loadSchedulesFromDisk work
- Modifying configvis-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `static/configvis/jsontree.js` | B, E, I, C, _ (+99) |
| `static/configvis/prism.js` | encode, getLanguage, highlightAll, highlightAllUnder, highlightElement (+23) |
| `src/lib/scheduler.js` | addCronEntry, addSchedule, loadSchedulesFromDisk |
| `src/routes/rest_server/scheduler.js` | handlerPOSTSchedules |
| `src/lib/influxdb/client.js` | boolean |

## Entry Points

Start here when exploring this area:

- **`addSchedule`** (Function) — `src/lib/scheduler.js:68`
- **`loadSchedulesFromDisk`** (Function) — `src/lib/scheduler.js:98`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `addSchedule` | Function | `src/lib/scheduler.js` | 68 |
| `loadSchedulesFromDisk` | Function | `src/lib/scheduler.js` | 98 |
| `B` | Function | `static/configvis/jsontree.js` | 2032 |
| `E` | Function | `static/configvis/jsontree.js` | 2117 |
| `I` | Function | `static/configvis/jsontree.js` | 2138 |
| `C` | Function | `static/configvis/jsontree.js` | 2144 |
| `_` | Function | `static/configvis/jsontree.js` | 2150 |
| `A` | Function | `static/configvis/jsontree.js` | 2156 |
| `O` | Function | `static/configvis/jsontree.js` | 2163 |
| `P` | Function | `static/configvis/jsontree.js` | 2216 |
| `W` | Function | `static/configvis/jsontree.js` | 2304 |
| `$` | Function | `static/configvis/jsontree.js` | 2327 |
| `J` | Function | `static/configvis/jsontree.js` | 2337 |
| `Ce` | Function | `static/configvis/jsontree.js` | 3715 |
| `Ae` | Function | `static/configvis/jsontree.js` | 3747 |
| `openAll` | Function | `static/configvis/jsontree.js` | 3803 |
| `closeAll` | Function | `static/configvis/jsontree.js` | 3809 |
| `backPage` | Function | `static/configvis/jsontree.js` | 3815 |
| `nextPage` | Function | `static/configvis/jsontree.js` | 3824 |
| `i` | Function | `static/configvis/jsontree.js` | 70 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `O → Type` | cross_community | 5 |
| `O → ObjId` | cross_community | 5 |
| `A → JsonStringToObject` | cross_community | 5 |
| `A → CsvStringToObject` | cross_community | 5 |
| `A → Q` | cross_community | 5 |
| `A → U` | cross_community | 5 |
| `A → Ae` | cross_community | 5 |
| `A → SymbolToString` | cross_community | 5 |
| `S → J` | cross_community | 4 |
| `S → Z` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Rest_server | 3 calls |
| Qrs_util | 1 calls |
| Incident_mgmt | 1 calls |
| Qseow | 1 calls |

## How to Explore

1. `gitnexus_context({name: "addSchedule"})` — see callers and callees
2. `gitnexus_query({query: "configvis"})` — find related execution flows
3. Read key files listed above for implementation details
