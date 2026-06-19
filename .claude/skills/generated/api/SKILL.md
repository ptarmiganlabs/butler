---
name: api
description: "Skill for the Api area of butler. 8 symbols across 4 files."
---

# Api

8 symbols | 4 files | Cohesion: 52%

## When to Use

- Working with code in `src/`
- Understanding how getQlikSenseCloudAppInfo, getQlikSenseCloudAppMetadata, getQlikSenseCloudAppItems work
- Modifying api-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/qscloud/api/app.js` | getQlikSenseCloudAppInfo, getQlikSenseCloudAppMetadata, getQlikSenseCloudAppItems |
| `src/lib/mqtt_handlers.js` | mqttInitHandlers, readCert |
| `src/lib/qscloud/api/appreloadinfo.js` | getQlikSenseCloudAppReloadScriptLog, getQlikSenseCloudAppReloadInfo |
| `src/lib/qscloud/mqtt_event_app_reload_finished.js` | handleQlikSenseCloudAppReloadFinished |

## Entry Points

Start here when exploring this area:

- **`getQlikSenseCloudAppInfo`** (Function) — `src/lib/qscloud/api/app.js:11`
- **`getQlikSenseCloudAppMetadata`** (Function) — `src/lib/qscloud/api/app.js:46`
- **`getQlikSenseCloudAppItems`** (Function) — `src/lib/qscloud/api/app.js:81`
- **`getQlikSenseCloudAppReloadScriptLog`** (Function) — `src/lib/qscloud/api/appreloadinfo.js:13`
- **`getQlikSenseCloudAppReloadInfo`** (Function) — `src/lib/qscloud/api/appreloadinfo.js:86`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getQlikSenseCloudAppInfo` | Function | `src/lib/qscloud/api/app.js` | 11 |
| `getQlikSenseCloudAppMetadata` | Function | `src/lib/qscloud/api/app.js` | 46 |
| `getQlikSenseCloudAppItems` | Function | `src/lib/qscloud/api/app.js` | 81 |
| `getQlikSenseCloudAppReloadScriptLog` | Function | `src/lib/qscloud/api/appreloadinfo.js` | 13 |
| `getQlikSenseCloudAppReloadInfo` | Function | `src/lib/qscloud/api/appreloadinfo.js` | 86 |
| `handleQlikSenseCloudAppReloadFinished` | Function | `src/lib/qscloud/mqtt_event_app_reload_finished.js` | 31 |
| `mqttInitHandlers` | Function | `src/lib/mqtt_handlers.js` | 17 |
| `readCert` | Function | `src/lib/mqtt_handlers.js` | 52 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleQlikSenseCloudAppReloadFinished → GetErrorMessage` | cross_community | 3 |
| `MqttInitHandlers → GetErrorMessage` | cross_community | 3 |
| `MqttInitHandlers → GetQRSHttpHeaders` | cross_community | 3 |
| `MqttInitHandlers → QrsClient` | cross_community | 3 |
| `MqttInitHandlers → Post` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 8 calls |
| Qscloud | 3 calls |
| Smtp | 1 calls |
| Qrs_util | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getQlikSenseCloudAppInfo"})` — see callers and callees
2. `gitnexus_query({query: "api"})` — find related execution flows
3. Read key files listed above for implementation details
