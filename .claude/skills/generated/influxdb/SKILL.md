---
name: influxdb
description: "Skill for the Influxdb area of butler. 43 symbols across 13 files."
---

# Influxdb

43 symbols | 13 files | Cohesion: 67%

## When to Use

- Working with code in `src/`
- Understanding how getInfluxDbVersion, getInfluxDbHost, getInfluxDbPort work
- Modifying influxdb-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/influxdb/client.js` | safeConfigGet, getInfluxDbVersion, getInfluxDbHost, getInfluxDbPort, getInfluxDbV1Config (+8) |
| `src/globals.js` | init, getEnabledApiEndpoints, resolveCertPath, readCert, loadCertificates (+4) |
| `src/lib/influxdb/task_success.js` | postReloadTaskSuccessNotificationInfluxDb, postUserSyncTaskSuccessNotificationInfluxDb, postExternalProgramTaskSuccessNotificationInfluxDb, postDistributeTaskSuccessNotificationInfluxDb, postPreloadTaskSuccessNotificationInfluxDb |
| `src/lib/rest_api.js` | loadTlsFile, isRestApiTlsEnabled, getRestApiPublicBaseUrl, getRestApiTlsOptions |
| `src/lib/influxdb/qlik_sense_license.js` | postQlikSenseServerLicenseStatusToInfluxDB, postQlikSenseLicenseStatusToInfluxDB |
| `src/lib/influxdb/task_failure.js` | postReloadTaskFailureNotificationInfluxDb, postPreloadTaskFailureNotificationInfluxDb |
| `src/lib/config_obfuscate.js` | configObfuscate, maskValue |
| `src/udp/handlers/task_types/failed_preload.js` | handleFailedPreloadTask |
| `src/udp/handlers/task_types/success_distribute.js` | handleSuccessDistributeTask |
| `src/app.js` | build |

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
| `postQlikSenseServerLicenseStatusToInfluxDB` | Function | `src/lib/influxdb/qlik_sense_license.js` | 16 |
| `postQlikSenseLicenseStatusToInfluxDB` | Function | `src/lib/influxdb/qlik_sense_license.js` | 97 |
| `postReloadTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 27 |
| `postPreloadTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 465 |
| `postReloadTaskSuccessNotificationInfluxDb` | Function | `src/lib/influxdb/task_success.js` | 28 |
| `postUserSyncTaskSuccessNotificationInfluxDb` | Function | `src/lib/influxdb/task_success.js` | 271 |
| `postExternalProgramTaskSuccessNotificationInfluxDb` | Function | `src/lib/influxdb/task_success.js` | 420 |
| `postDistributeTaskSuccessNotificationInfluxDb` | Function | `src/lib/influxdb/task_success.js` | 566 |
| `postPreloadTaskSuccessNotificationInfluxDb` | Function | `src/lib/influxdb/task_success.js` | 728 |
| `handleFailedPreloadTask` | Function | `src/udp/handlers/task_types/failed_preload.js` | 54 |
| `handleSuccessDistributeTask` | Function | `src/udp/handlers/task_types/success_distribute.js` | 39 |
| `postButlerMemoryUsageToInfluxdb` | Function | `src/lib/influxdb/butler_metrics.js` | 18 |
| `postButlerUptimeToNewRelic` | Function | `src/lib/post_to_new_relic.js` | 17 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Build → AddLegacyFieldsToPoint` | cross_community | 6 |
| `HandleSuccessDistributeTask → AddLegacyFieldsToPoint` | intra_community | 5 |
| `HandleSuccessPreloadTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleFailedDistributeTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleFailedExternalProgramTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleFailedUserSyncTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `Build → Has` | cross_community | 5 |
| `HandlerPUTSchedulesStart → CheckFileExistsSync` | cross_community | 5 |
| `HandlerPUTSchedulesStart → GetEnabledApiEndpoints` | cross_community | 5 |
| `CheckQlikSenseAccessLicenseStatus → AddLegacyFieldsToPoint` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 21 calls |
| Incident_mgmt | 7 calls |
| Smtp | 4 calls |
| Qrs_util | 3 calls |
| Rest_server | 1 calls |
| Configvis | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getInfluxDbVersion"})` — see callers and callees
2. `gitnexus_query({query: "influxdb"})` — find related execution flows
3. Read key files listed above for implementation details
