---
name: qseow
description: "Skill for the Qseow area of butler. 65 symbols across 33 files."
---

# Qseow

65 symbols | 33 files | Cohesion: 45%

## When to Use

- Working with code in `src/`
- Understanding how verifyTaskId, verifyGuid, sendReloadTaskFailureNotification work
- Modifying qseow-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/qseow/webhook_notification.js` | getOutgoingWebhookReloadFailedNotificationConfigOk, getOutgoingWebhookReloadAbortedNotificationConfigOk, getOutgoingWebhookServiceMonitorConfig, sendOutgoingWebhook, sendOutgoingWebhookServiceMonitor (+3) |
| `src/lib/qseow/winsvc.js` | isValidHost, isValidServiceName, exists, statusAll, status (+1) |
| `src/lib/incident_mgmt/signl4.js` | getReloadFailedEventConfig, getReloadAbortedEventConfig, sendSignl4, sendReloadTaskFailureNotification, sendReloadTaskAbortedNotification |
| `src/lib/qseow/service_monitor.js` | serviceMonitorMqttSend1, serviceMonitorMqttSend2, checkServiceStatus, verifyServicesExist, setupServiceMonitorTimer |
| `src/globals.js` | getErrorMessage, initHostInfo, isRunningInDocker |
| `src/lib/influxdb/task_failure.js` | postExternalProgramTaskFailureNotificationInfluxDb, postDistributeTaskFailureNotificationInfluxDb, postUserSyncTaskFailureNotificationInfluxDb |
| `src/lib/qseow/slack_notification.js` | getSlackServiceMonitorNotificationConfig, sendSlack, sendServiceMonitorNotificationSlack |
| `src/lib/heartbeat.js` | callRemoteURL, setupHeartbeatTimer |
| `src/lib/key_value_store.js` | getNamespaceList, deleteNamespace |
| `src/lib/post_to_new_relic.js` | postFailedReloadEventToNewRelic, postAbortedReloadEventToNewRelic |

## Entry Points

Start here when exploring this area:

- **`verifyTaskId`** (Function) — `src/lib/config_util.js:44`
- **`verifyGuid`** (Function) — `src/lib/guid_util.js:19`
- **`sendReloadTaskFailureNotification`** (Function) — `src/lib/incident_mgmt/signl4.js:154`
- **`sendReloadTaskAbortedNotification`** (Function) — `src/lib/incident_mgmt/signl4.js:191`
- **`postQlikSenseVersionToInfluxDB`** (Function) — `src/lib/influxdb/qlik_sense_version.js:22`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `verifyTaskId` | Function | `src/lib/config_util.js` | 44 |
| `verifyGuid` | Function | `src/lib/guid_util.js` | 19 |
| `sendReloadTaskFailureNotification` | Function | `src/lib/incident_mgmt/signl4.js` | 154 |
| `sendReloadTaskAbortedNotification` | Function | `src/lib/incident_mgmt/signl4.js` | 191 |
| `postQlikSenseVersionToInfluxDB` | Function | `src/lib/influxdb/qlik_sense_version.js` | 22 |
| `postExternalProgramTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 231 |
| `postDistributeTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 346 |
| `postUserSyncTaskFailureNotificationInfluxDb` | Function | `src/lib/influxdb/task_failure.js` | 582 |
| `getNamespaceList` | Function | `src/lib/key_value_store.js` | 12 |
| `deleteNamespace` | Function | `src/lib/key_value_store.js` | 32 |
| `postFailedReloadEventToNewRelic` | Function | `src/lib/post_to_new_relic.js` | 168 |
| `postAbortedReloadEventToNewRelic` | Function | `src/lib/post_to_new_relic.js` | 182 |
| `sendServiceMonitorNotificationSlack` | Function | `src/lib/qseow/slack_notification.js` | 858 |
| `sendReloadTaskFailureNotificationWebhook` | Function | `src/lib/qseow/webhook_notification.js` | 819 |
| `sendReloadTaskAbortedNotificationWebhook` | Function | `src/lib/qseow/webhook_notification.js` | 857 |
| `sendServiceMonitorWebhook` | Function | `src/lib/qseow/webhook_notification.js` | 895 |
| `getSchedulesStatus` | Function | `src/lib/scheduler.js` | 182 |
| `setupAnonUsageReportTimer` | Function | `src/lib/telemetry.js` | 532 |
| `handleAbortedDistributeTask` | Function | `src/udp/handlers/task_types/aborted_distribute.js` | 35 |
| `handleAbortedExternalProgramTask` | Function | `src/udp/handlers/task_types/aborted_externalprogram.js` | 34 |

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
| `Start → GetErrorMessage` | cross_community | 5 |
| `ProcessSanitizedUdpMessage → GetErrorMessage` | cross_community | 5 |
| `HandleFailedPreloadTask → GetErrorMessage` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Incident_mgmt | 10 calls |
| Influxdb | 5 calls |
| Smtp | 4 calls |
| Rest_server | 3 calls |
| Assert | 1 calls |

## How to Explore

1. `gitnexus_context({name: "verifyTaskId"})` — see callers and callees
2. `gitnexus_query({query: "qseow"})` — find related execution flows
3. Read key files listed above for implementation details
