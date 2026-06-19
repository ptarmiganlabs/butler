---
name: incident-mgmt
description: "Skill for the Incident_mgmt area of butler. 19 symbols across 8 files."
---

# Incident_mgmt

19 symbols | 8 files | Cohesion: 39%

## When to Use

- Working with code in `src/`
- Understanding how configVerifyAllTaskId, callQlikSenseServerLicenseWebhook, checkDuplicate work
- Modifying incident_mgmt-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/incident_mgmt/new_relic.js` | getReloadFailedEventConfig, getReloadFailedLogConfig, getReloadAbortedEventConfig, getReloadAbortedLogConfig |
| `src/lib/incident_mgmt/new_relic_service_monitor.js` | getServiceStateEventConfig, getServiceStateLogConfig, sendServiceMonitorEvent, sendServiceMonitorLog |
| `src/lib/qseow/webhook_notification.js` | getOutgoingWebhookQlikSenseServerLicenseMonitorConfig, getOutgoingWebhookQlikSenseServerLicenseExpiryAlertConfig, sendOutgoingWebhookQlikSenseServerLicense, callQlikSenseServerLicenseWebhook |
| `src/lib/qseow/msteams_notification.js` | getTeamsReloadFailedNotificationConfigOk, getTeamsReloadAbortedNotificationConfigOk |
| `src/lib/udp_queue_manager.js` | has, checkDuplicate |
| `src/lib/config_util.js` | configVerifyAllTaskId |
| `src/lib/qseow/service_monitor.js` | serviceMonitorNewRelicSend1 |
| `src/lib/qseow/slack_notification.js` | getSlackReloadAbortedNotificationConfigOk |

## Entry Points

Start here when exploring this area:

- **`configVerifyAllTaskId`** (Function) — `src/lib/config_util.js:12`
- **`callQlikSenseServerLicenseWebhook`** (Function) — `src/lib/qseow/webhook_notification.js:950`
- **`checkDuplicate`** (Method) — `src/lib/udp_queue_manager.js:406`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `configVerifyAllTaskId` | Function | `src/lib/config_util.js` | 12 |
| `callQlikSenseServerLicenseWebhook` | Function | `src/lib/qseow/webhook_notification.js` | 950 |
| `checkDuplicate` | Method | `src/lib/udp_queue_manager.js` | 406 |
| `getReloadFailedEventConfig` | Function | `src/lib/incident_mgmt/new_relic.js` | 83 |
| `getReloadFailedLogConfig` | Function | `src/lib/incident_mgmt/new_relic.js` | 164 |
| `getReloadAbortedEventConfig` | Function | `src/lib/incident_mgmt/new_relic.js` | 242 |
| `getReloadAbortedLogConfig` | Function | `src/lib/incident_mgmt/new_relic.js` | 323 |
| `getServiceStateEventConfig` | Function | `src/lib/incident_mgmt/new_relic_service_monitor.js` | 43 |
| `getServiceStateLogConfig` | Function | `src/lib/incident_mgmt/new_relic_service_monitor.js` | 114 |
| `sendServiceMonitorEvent` | Function | `src/lib/incident_mgmt/new_relic_service_monitor.js` | 183 |
| `sendServiceMonitorLog` | Function | `src/lib/incident_mgmt/new_relic_service_monitor.js` | 284 |
| `getTeamsReloadFailedNotificationConfigOk` | Function | `src/lib/qseow/msteams_notification.js` | 66 |
| `getTeamsReloadAbortedNotificationConfigOk` | Function | `src/lib/qseow/msteams_notification.js` | 132 |
| `serviceMonitorNewRelicSend1` | Function | `src/lib/qseow/service_monitor.js` | 35 |
| `getSlackReloadAbortedNotificationConfigOk` | Function | `src/lib/qseow/slack_notification.js` | 141 |
| `getOutgoingWebhookQlikSenseServerLicenseMonitorConfig` | Function | `src/lib/qseow/webhook_notification.js` | 207 |
| `getOutgoingWebhookQlikSenseServerLicenseExpiryAlertConfig` | Function | `src/lib/qseow/webhook_notification.js` | 226 |
| `sendOutgoingWebhookQlikSenseServerLicense` | Function | `src/lib/qseow/webhook_notification.js` | 644 |
| `has` | Method | `src/lib/udp_queue_manager.js` | 65 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `Build → Has` | cross_community | 5 |
| `HandlerPUTSchedulesStart → Has` | cross_community | 5 |
| `CheckServiceStatus → Has` | cross_community | 5 |
| `CheckServiceStatus → GetErrorMessage` | cross_community | 5 |
| `CreateInfluxDbClient → Has` | cross_community | 4 |
| `SetupServiceMonitorTimer → Has` | cross_community | 4 |
| `EnqueueDeduplicated → Has` | cross_community | 4 |
| `HandleAbortedReloadTask → Has` | cross_community | 3 |
| `HandlerPutStartTask → Has` | cross_community | 3 |
| `SendQlikSenseCloudAppReloadFailureNotificationSlack → Has` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 16 calls |
| Qrs_util | 2 calls |

## How to Explore

1. `gitnexus_context({name: "configVerifyAllTaskId"})` — see callers and callees
2. `gitnexus_query({query: "incident_mgmt"})` — find related execution flows
3. Read key files listed above for implementation details
