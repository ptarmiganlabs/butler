---
name: qrs-util
description: "Skill for the Qrs_util area of butler. 45 symbols across 29 files."
---

# Qrs_util

45 symbols | 29 files | Cohesion: 81%

## When to Use

- Working with code in `src/`
- Understanding how configFileNewRelicAssert, postQlikSenseLicenseReleasedToInfluxDB, hasExpectedQrsStatus work
- Modifying qrs_util-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/qseow/qliksense_license.js` | buildQrsConfig, getQrsErrorConfig, checkQlikSenseServerLicenseStatus, checkQlikSenseAccessLicenseStatus, licenseReleaseProfessional (+2) |
| `src/lib/qrs_client.js` | QrsClient, Get, Post, Delete |
| `src/lib/qseow/scriptlog.js` | delay, getScriptLogWithFileReferenceId, getScriptLogWithExecutionResultId, getScriptLog |
| `src/lib/qrs_error.js` | hasExpectedQrsStatus, formatQrsResultWithContext, formatQrsErrorWithContext |
| `src/qrs_util/task_cp_util.js` | isCustomPropertyValueSet, getReloadTasksCustomProperties |
| `src/udp/handlers/distribution_queue.js` | add, isIntermediateState |
| `src/globals.js` | getQRSHttpHeaders |
| `src/lib/assert/assert_config_file.js` | configFileNewRelicAssert |
| `src/lib/influxdb/qlik_sense_license.js` | postQlikSenseLicenseReleasedToInfluxDB |
| `src/qrs_util/app_metadata.js` | getAppMetadata |

## Entry Points

Start here when exploring this area:

- **`configFileNewRelicAssert`** (Function) — `src/lib/assert/assert_config_file.js:285`
- **`postQlikSenseLicenseReleasedToInfluxDB`** (Function) — `src/lib/influxdb/qlik_sense_license.js:289`
- **`hasExpectedQrsStatus`** (Function) — `src/lib/qrs_error.js:101`
- **`formatQrsResultWithContext`** (Function) — `src/lib/qrs_error.js:127`
- **`formatQrsErrorWithContext`** (Function) — `src/lib/qrs_error.js:184`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `configFileNewRelicAssert` | Function | `src/lib/assert/assert_config_file.js` | 285 |
| `postQlikSenseLicenseReleasedToInfluxDB` | Function | `src/lib/influxdb/qlik_sense_license.js` | 289 |
| `hasExpectedQrsStatus` | Function | `src/lib/qrs_error.js` | 101 |
| `formatQrsResultWithContext` | Function | `src/lib/qrs_error.js` | 127 |
| `formatQrsErrorWithContext` | Function | `src/lib/qrs_error.js` | 184 |
| `getScriptLog` | Function | `src/lib/qseow/scriptlog.js` | 198 |
| `getDistributeTaskExecutionResults` | Function | `src/qrs_util/distribute_task_execution_results.js` | 58 |
| `getExternalProgramTaskExecutionResults` | Function | `src/qrs_util/externalprogram_task_execution_results.js` | 35 |
| `getPreloadTaskExecutionResults` | Function | `src/qrs_util/preload_task_execution_results.js` | 58 |
| `getReloadTaskExecutionResults` | Function | `src/qrs_util/reload_task_execution_results.js` | 35 |
| `isCustomPropertyValueSet` | Function | `src/qrs_util/task_cp_util.js` | 14 |
| `getReloadTasksCustomProperties` | Function | `src/qrs_util/task_cp_util.js` | 155 |
| `getUserSyncTaskExecutionResults` | Function | `src/qrs_util/usersync_task_execution_results.js` | 35 |
| `handleSuccessDistributeTask` | Function | `src/udp/handlers/task_types/success_distribute.js` | 39 |
| `handleSuccessPreloadTask` | Function | `src/udp/handlers/task_types/success_preload.js` | 39 |
| `handleSuccessReloadTask` | Function | `src/udp/handlers/task_types/success_reload.js` | 56 |
| `QrsClient` | Class | `src/lib/qrs_client.js` | 17 |
| `buildQrsConfig` | Function | `src/lib/qseow/qliksense_license.js` | 16 |
| `getQrsErrorConfig` | Function | `src/lib/qseow/qliksense_license.js` | 35 |
| `checkQlikSenseServerLicenseStatus` | Function | `src/lib/qseow/qliksense_license.js` | 48 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DistributionEnded → GetQRSHttpHeaders` | cross_community | 6 |
| `DistributionEnded → QrsClient` | cross_community | 6 |
| `DistributeTaskCompletion → GetQRSHttpHeaders` | cross_community | 6 |
| `DistributeTaskCompletion → QrsClient` | cross_community | 6 |
| `HandleSuccessDistributeTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleSuccessPreloadTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `DistributionEnded → StopPolling` | cross_community | 5 |
| `DistributionEnded → IsFinalState` | cross_community | 5 |
| `DistributeTaskCompletion → StopPolling` | cross_community | 5 |
| `DistributeTaskCompletion → IsFinalState` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 14 calls |
| Incident_mgmt | 7 calls |
| Influxdb | 7 calls |
| Smtp | 3 calls |
| Handlers | 1 calls |

## How to Explore

1. `gitnexus_context({name: "configFileNewRelicAssert"})` — see callers and callees
2. `gitnexus_query({query: "qrs_util"})` — find related execution flows
3. Read key files listed above for implementation details
