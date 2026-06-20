---
name: influxdb
description: "Skill for the Influxdb area of butler. 44 symbols across 14 files."
---

# Influxdb

44 symbols | 14 files | Cohesion: 65%

## When to Use

- Working with code in `src/`
- Understanding how getInfluxDbVersion, getInfluxDbHost, getInfluxDbPort work
- Modifying influxdb-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/influxdb/client.js` | safeConfigGet, getInfluxDbVersion, getInfluxDbHost, getInfluxDbPort, getInfluxDbV1Config (+8) |
| `src/globals.js` | init, getEnabledApiEndpoints, resolveCertPath, readCert, loadCertificates (+5) |
| `src/lib/influxdb/task_success.js` | postReloadTaskSuccessNotificationInfluxDb, postDistributeTaskSuccessNotificationInfluxDb, postPreloadTaskSuccessNotificationInfluxDb, postUserSyncTaskSuccessNotificationInfluxDb, postExternalProgramTaskSuccessNotificationInfluxDb |
| `src/lib/rest_api.js` | loadTlsFile, isRestApiTlsEnabled, getRestApiPublicBaseUrl, getRestApiTlsOptions |
| `src/lib/config_obfuscate.js` | configObfuscate, maskValue |
| `src/lib/influxdb/qlik_sense_license.js` | postQlikSenseServerLicenseStatusToInfluxDB, postQlikSenseLicenseStatusToInfluxDB |
| `src/app.js` | build |
| `src/lib/influxdb/butler_metrics.js` | postButlerMemoryUsageToInfluxdb |
| `src/lib/post_to_new_relic.js` | postButlerUptimeToNewRelic |
| `src/lib/service_uptime.js` | serviceUptimeStart |

## Entry Points

Start here when exploring this area:

- **`getInfluxDbVersion`** (Function) — `src/lib/influxdb/client.js:51`
- **`getInfluxDbHost`** (Function) — `src/lib/influxdb/client.js:62`
- **`getInfluxDbPort`** (Function) — `src/lib/influxdb/client.js:72`
- **`getInfluxDbV1Config`** (Function) — `src/lib/influxdb/client.js:85`
- **`getInfluxDbV2Config`** (Function) — `src/lib/influxdb/client.js:108`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getInfluxDbVersion` | Function | `src/lib/influxdb/client.js` | 51 |
| `getInfluxDbHost` | Function | `src/lib/influxdb/client.js` | 62 |
| `getInfluxDbPort` | Function | `src/lib/influxdb/client.js` | 72 |
| `getInfluxDbV1Config` | Function | `src/lib/influxdb/client.js` | 85 |
| `getInfluxDbV2Config` | Function | `src/lib/influxdb/client.js` | 108 |
| `getInfluxDbV3Config` | Function | `src/lib/influxdb/client.js` | 118 |
| `createInfluxDbClient` | Function | `src/lib/influxdb/client.js` | 339 |
| `postButlerMemoryUsageToInfluxdb` | Function | `src/lib/influxdb/butler_metrics.js` | 18 |
| `postButlerUptimeToNewRelic` | Function | `src/lib/post_to_new_relic.js` | 17 |
| `isRestApiTlsEnabled` | Function | `src/lib/rest_api.js` | 17 |
| `getRestApiPublicBaseUrl` | Function | `src/lib/rest_api.js` | 21 |
| `getRestApiTlsOptions` | Function | `src/lib/rest_api.js` | 27 |
| `postQlikSenseServerLicenseStatusToInfluxDB` | Function | `src/lib/influxdb/qlik_sense_license.js` | 16 |
| `postQlikSenseLicenseStatusToInfluxDB` | Function | `src/lib/influxdb/qlik_sense_license.js` | 97 |
| `postPreloadTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 465 |
| `postReloadTaskSuccessNotificationInfluxDb` | Function | `src/lib/influxdb/task_success.js` | 28 |
| `postDistributeTaskSuccessNotificationInfluxDb` | Function | `src/lib/influxdb/task_success.js` | 566 |
| `postPreloadTaskSuccessNotificationInfluxDb` | Function | `src/lib/influxdb/task_success.js` | 728 |
| `handleFailedPreloadTask` | Function | `src/udp/handlers/task_types/failed_preload.js` | 54 |
| `postUserSyncTaskSuccessNotificationInfluxDb` | Function | `src/lib/influxdb/task_success.js` | 271 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Build → AddLegacyFieldsToPoint` | cross_community | 6 |
| `HandleSuccessDistributeTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleSuccessPreloadTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleFailedDistributeTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleFailedExternalProgramTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleFailedUserSyncTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `Build → Has` | cross_community | 5 |
| `HandlerPUTSchedulesStart → CheckFileExistsSync` | cross_community | 5 |
| `HandlerPUTSchedulesStart → GetEnabledApiEndpoints` | cross_community | 5 |
| `CheckQlikSenseVersion → AddLegacyFieldsToPoint` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 21 calls |
| Incident_mgmt | 8 calls |
| Qrs_util | 5 calls |
| Smtp | 3 calls |
| Rest_server | 1 calls |
| Configvis | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getInfluxDbVersion"})` — see callers and callees
2. `gitnexus_query({query: "influxdb"})` — find related execution flows
3. Read key files listed above for implementation details
