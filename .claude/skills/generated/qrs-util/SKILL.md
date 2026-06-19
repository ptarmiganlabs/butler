---
name: qrs-util
description: "Skill for the Qrs_util area of butler. 50 symbols across 31 files."
---

# Qrs_util

50 symbols | 31 files | Cohesion: 71%

## When to Use

- Working with code in `src/`
- Understanding how configFileNewRelicAssert, sendNewRelicEvent, sendNewRelicLog work
- Modifying qrs_util-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/incident_mgmt/new_relic.js` | getQRSConfig, sendNewRelicEvent, sendNewRelicLog, sendReloadTaskFailureEvent, sendReloadTaskFailureLog (+2) |
| `src/lib/qseow/qliksense_license.js` | checkQlikSenseServerLicenseStatus, checkQlikSenseAccessLicenseStatus, licenseReleaseProfessional, licenseReleaseAnalyzer, checkQlikSenseLicenseRelease |
| `src/lib/qrs_client.js` | QrsClient, Get, Post, Delete |
| `src/lib/qseow/scriptlog.js` | delay, getScriptLogWithFileReferenceId, getScriptLogWithExecutionResultId, getScriptLog |
| `src/globals.js` | sleep, getQRSHttpHeaders |
| `src/qrs_util/task_cp_util.js` | isCustomPropertyValueSet, getReloadTasksCustomProperties |
| `src/udp/handlers/distribution_queue.js` | add, isIntermediateState |
| `src/lib/assert/assert_config_file.js` | configFileNewRelicAssert |
| `src/lib/influxdb/qlik_sense_license.js` | postQlikSenseLicenseReleasedToInfluxDB |
| `src/qrs_util/app_metadata.js` | getAppMetadata |

## Entry Points

Start here when exploring this area:

- **`configFileNewRelicAssert`** (Function) — `src/lib/assert/assert_config_file.js:284`
- **`sendNewRelicEvent`** (Function) — `src/lib/incident_mgmt/new_relic.js:403`
- **`sendNewRelicLog`** (Function) — `src/lib/incident_mgmt/new_relic.js:490`
- **`sendReloadTaskFailureEvent`** (Function) — `src/lib/incident_mgmt/new_relic.js:640`
- **`sendReloadTaskFailureLog`** (Function) — `src/lib/incident_mgmt/new_relic.js:784`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `configFileNewRelicAssert` | Function | `src/lib/assert/assert_config_file.js` | 284 |
| `sendNewRelicEvent` | Function | `src/lib/incident_mgmt/new_relic.js` | 403 |
| `sendNewRelicLog` | Function | `src/lib/incident_mgmt/new_relic.js` | 490 |
| `sendReloadTaskFailureEvent` | Function | `src/lib/incident_mgmt/new_relic.js` | 640 |
| `sendReloadTaskFailureLog` | Function | `src/lib/incident_mgmt/new_relic.js` | 784 |
| `sendReloadTaskAbortedEvent` | Function | `src/lib/incident_mgmt/new_relic.js` | 926 |
| `sendReloadTaskAbortedLog` | Function | `src/lib/incident_mgmt/new_relic.js` | 1070 |
| `postQlikSenseLicenseReleasedToInfluxDB` | Function | `src/lib/influxdb/qlik_sense_license.js` | 289 |
| `getScriptLog` | Function | `src/lib/qseow/scriptlog.js` | 147 |
| `getDistributeTaskExecutionResults` | Function | `src/qrs_util/distribute_task_execution_results.js` | 57 |
| `getExternalProgramTaskExecutionResults` | Function | `src/qrs_util/externalprogram_task_execution_results.js` | 34 |
| `getPreloadTaskExecutionResults` | Function | `src/qrs_util/preload_task_execution_results.js` | 57 |
| `getReloadTaskExecutionResults` | Function | `src/qrs_util/reload_task_execution_results.js` | 34 |
| `isCustomPropertyValueSet` | Function | `src/qrs_util/task_cp_util.js` | 13 |
| `getReloadTasksCustomProperties` | Function | `src/qrs_util/task_cp_util.js` | 124 |
| `getUserSyncTaskExecutionResults` | Function | `src/qrs_util/usersync_task_execution_results.js` | 34 |
| `handleAbortedReloadTask` | Function | `src/udp/handlers/task_types/aborted_reload.js` | 63 |
| `handleSuccessExternalProgramTask` | Function | `src/udp/handlers/task_types/success_externalprogram.js` | 38 |
| `handleSuccessPreloadTask` | Function | `src/udp/handlers/task_types/success_preload.js` | 39 |
| `handleSuccessReloadTask` | Function | `src/udp/handlers/task_types/success_reload.js` | 56 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DistributionEnded → GetQRSHttpHeaders` | cross_community | 6 |
| `DistributionEnded → QrsClient` | cross_community | 6 |
| `DistributeTaskCompletion → GetQRSHttpHeaders` | cross_community | 6 |
| `DistributeTaskCompletion → QrsClient` | cross_community | 6 |
| `HandleSuccessPreloadTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `DistributionEnded → StopPolling` | cross_community | 5 |
| `DistributionEnded → IsFinalState` | cross_community | 5 |
| `DistributeTaskCompletion → StopPolling` | cross_community | 5 |
| `DistributeTaskCompletion → IsFinalState` | cross_community | 5 |
| `CheckQlikSenseAccessLicenseStatus → AddLegacyFieldsToPoint` | cross_community | 5 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 40 calls |
| Incident_mgmt | 14 calls |
| Influxdb | 7 calls |
| Smtp | 5 calls |
| Handlers | 1 calls |

## How to Explore

1. `gitnexus_context({name: "configFileNewRelicAssert"})` — see callers and callees
2. `gitnexus_query({query: "qrs_util"})` — find related execution flows
3. Read key files listed above for implementation details
