---
name: qseow
description: "Skill for the Qseow area of butler. 80 symbols across 37 files."
---

# Qseow

80 symbols | 37 files | Cohesion: 53%

## When to Use

- Working with code in `src/`
- Understanding how verifyTaskId, verifyGuid, sendReloadTaskFailureNotification work
- Modifying qseow-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/qseow/webhook_notification.js` | getOutgoingWebhookReloadFailedNotificationConfigOk, getOutgoingWebhookReloadAbortedNotificationConfigOk, getOutgoingWebhookServiceMonitorConfig, sendOutgoingWebhook, sendOutgoingWebhookServiceMonitor (+3) |
| `src/lib/qseow/slack_notification.js` | getSlackReloadFailedNotificationConfigOk, getSlackServiceMonitorNotificationConfig, sendSlack, sendReloadTaskFailureNotificationSlack, escapeForJson (+1) |
| `src/lib/qseow/winsvc.js` | isValidHost, isValidServiceName, exists, statusAll, status (+1) |
| `src/lib/incident_mgmt/signl4.js` | getReloadFailedEventConfig, getReloadAbortedEventConfig, sendSignl4, sendReloadTaskFailureNotification, sendReloadTaskAbortedNotification |
| `src/lib/qrs_error.js` | appendRequestContext, appendResponseBodySummary, hasExpectedHttpStatus, formatHttpResultWithContext, formatHttpErrorWithContext |
| `src/lib/qseow/service_monitor.js` | verifyServicesExist, setupServiceMonitorTimer, serviceMonitorMqttSend1, serviceMonitorMqttSend2, checkServiceStatus |
| `src/lib/influxdb/task_failure.js` | postReloadTaskFailureNotificationInfluxDb, postExternalProgramTaskFailureNotificationInfluxDb, postDistributeTaskFailureNotificationInfluxDb, postUserSyncTaskFailureNotificationInfluxDb |
| `src/globals.js` | getErrorMessage, initHostInfo, isRunningInDocker |
| `src/lib/qseow/qliksense_version.js` | getVersionMonitorRequestContext, checkQlikSenseVersion, setupQlikSenseVersionMonitor |
| `src/lib/heartbeat.js` | callRemoteURL, setupHeartbeatTimer |

## Entry Points

Start here when exploring this area:

- **`verifyTaskId`** (Function) — `src/lib/config_util.js:44`
- **`verifyGuid`** (Function) — `src/lib/guid_util.js:19`
- **`sendReloadTaskFailureNotification`** (Function) — `src/lib/incident_mgmt/signl4.js:154`
- **`sendReloadTaskAbortedNotification`** (Function) — `src/lib/incident_mgmt/signl4.js:191`
- **`postReloadTaskFailureNotificationInfluxDb`** (Function) — `src/lib/influxdb/task_failure.js:27`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `verifyTaskId` | Function | `src/lib/config_util.js` | 44 |
| `verifyGuid` | Function | `src/lib/guid_util.js` | 19 |
| `sendReloadTaskFailureNotification` | Function | `src/lib/incident_mgmt/signl4.js` | 154 |
| `sendReloadTaskAbortedNotification` | Function | `src/lib/incident_mgmt/signl4.js` | 191 |
| `postReloadTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 27 |
| `postExternalProgramTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 231 |
| `postDistributeTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 346 |
| `postUserSyncTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 582 |
| `getNamespaceList` | Function | `src/lib/key_value_store.js` | 12 |
| `deleteNamespace` | Function | `src/lib/key_value_store.js` | 32 |
| `postFailedReloadEventToNewRelic` | Function | `src/lib/post_to_new_relic.js` | 168 |
| `postAbortedReloadEventToNewRelic` | Function | `src/lib/post_to_new_relic.js` | 182 |
| `sendServiceMonitorNotificationTeams` | Function | `src/lib/qseow/msteams_notification.js` | 866 |
| `failedTaskStoreLogOnDisk` | Function | `src/lib/qseow/scriptlog.js` | 467 |
| `sendReloadTaskFailureNotificationSlack` | Function | `src/lib/qseow/slack_notification.js` | 441 |
| `escapeForJson` | Function | `src/lib/qseow/slack_notification.js` | 579 |
| `sendServiceMonitorNotificationSlack` | Function | `src/lib/qseow/slack_notification.js` | 858 |
| `sendReloadTaskFailureNotificationWebhook` | Function | `src/lib/qseow/webhook_notification.js` | 819 |
| `sendReloadTaskAbortedNotificationWebhook` | Function | `src/lib/qseow/webhook_notification.js` | 857 |
| `sendServiceMonitorWebhook` | Function | `src/lib/qseow/webhook_notification.js` | 895 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleFailedDistributeTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleFailedExternalProgramTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandleFailedUserSyncTask → AddLegacyFieldsToPoint` | cross_community | 5 |
| `HandlerPUTSchedulesStart → GetErrorMessage` | cross_community | 5 |
| `HandlerGetSenseAppDump → IsValidHost` | cross_community | 5 |
| `CheckServiceStatus → Has` | cross_community | 5 |
| `CheckServiceStatus → GetErrorMessage` | cross_community | 5 |
| `CheckQlikSenseVersion → AddLegacyFieldsToPoint` | cross_community | 5 |
| `Start → GetErrorMessage` | cross_community | 5 |
| `HandleFailedReloadTask → GetQRSHttpHeaders` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Incident_mgmt | 15 calls |
| Smtp | 9 calls |
| Influxdb | 6 calls |
| Rest_server | 3 calls |
| Qrs_util | 3 calls |
| Api | 1 calls |
| Assert | 1 calls |

## How to Explore

1. `gitnexus_context({name: "verifyTaskId"})` — see callers and callees
2. `gitnexus_query({query: "qseow"})` — find related execution flows
3. Read key files listed above for implementation details
