---
name: smtp
description: "Skill for the Smtp area of butler. 33 symbols across 19 files."
---

# Smtp

33 symbols | 19 files | Cohesion: 65%

## When to Use

- Working with code in `src/`
- Understanding how configFileStructureAssert, validate, getQlikSenseUrls work
- Modifying smtp-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/qseow/smtp/config.js` | isSmtpConfigOk, isEmailReloadSuccessNotificationConfigOk, isEmailReloadFailedNotificationConfigOk, isEmailReloadAbortedNotificationConfigOk, isEmailPreloadSuccessNotificationConfigOk (+3) |
| `src/lib/qseow/slack_notification.js` | getSlackReloadFailedNotificationConfigOk, sendReloadTaskFailureNotificationSlack, escapeForJson, sendReloadTaskAbortedNotificationSlack |
| `src/lib/qseow/msteams_notification.js` | sendTeams, sendReloadTaskFailureNotificationTeams, sendReloadTaskAbortedNotificationTeams |
| `src/lib/assert/assert_config_file.js` | configFileStructureAssert, validate |
| `src/lib/smtp_core.js` | sendEmail, sendEmailBasic |
| `src/lib/qseow/get_qs_urls.js` | getQlikSenseUrls |
| `src/lib/qseow/scriptlog.js` | failedTaskStoreLogOnDisk |
| `src/lib/qseow/smtp/distribute-task-failed.js` | sendDistributeTaskFailureNotificationEmail |
| `src/lib/qseow/smtp/distribute-task-success.js` | sendDistributeTaskSuccessNotificationEmail |
| `src/lib/qseow/smtp/preload-task-failed.js` | sendPreloadTaskFailureNotificationEmail |

## Entry Points

Start here when exploring this area:

- **`configFileStructureAssert`** (Function) — `src/lib/assert/assert_config_file.js:717`
- **`validate`** (Function) — `src/lib/assert/assert_config_file.js:742`
- **`getQlikSenseUrls`** (Function) — `src/lib/qseow/get_qs_urls.js:20`
- **`sendReloadTaskFailureNotificationTeams`** (Function) — `src/lib/qseow/msteams_notification.js:433`
- **`sendReloadTaskAbortedNotificationTeams`** (Function) — `src/lib/qseow/msteams_notification.js:649`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `configFileStructureAssert` | Function | `src/lib/assert/assert_config_file.js` | 717 |
| `validate` | Function | `src/lib/assert/assert_config_file.js` | 742 |
| `getQlikSenseUrls` | Function | `src/lib/qseow/get_qs_urls.js` | 20 |
| `sendReloadTaskFailureNotificationTeams` | Function | `src/lib/qseow/msteams_notification.js` | 433 |
| `sendReloadTaskAbortedNotificationTeams` | Function | `src/lib/qseow/msteams_notification.js` | 649 |
| `failedTaskStoreLogOnDisk` | Function | `src/lib/qseow/scriptlog.js` | 416 |
| `sendReloadTaskFailureNotificationSlack` | Function | `src/lib/qseow/slack_notification.js` | 441 |
| `escapeForJson` | Function | `src/lib/qseow/slack_notification.js` | 579 |
| `sendReloadTaskAbortedNotificationSlack` | Function | `src/lib/qseow/slack_notification.js` | 657 |
| `isSmtpConfigOk` | Function | `src/lib/qseow/smtp/config.js` | 102 |
| `isEmailReloadSuccessNotificationConfigOk` | Function | `src/lib/qseow/smtp/config.js` | 122 |
| `isEmailReloadFailedNotificationConfigOk` | Function | `src/lib/qseow/smtp/config.js` | 144 |
| `isEmailReloadAbortedNotificationConfigOk` | Function | `src/lib/qseow/smtp/config.js` | 166 |
| `isEmailPreloadSuccessNotificationConfigOk` | Function | `src/lib/qseow/smtp/config.js` | 188 |
| `isEmailPreloadFailedNotificationConfigOk` | Function | `src/lib/qseow/smtp/config.js` | 210 |
| `isEmailServiceMonitorNotificationConfig` | Function | `src/lib/qseow/smtp/config.js` | 232 |
| `getSmtpOptions` | Function | `src/lib/qseow/smtp/config.js` | 257 |
| `sendDistributeTaskFailureNotificationEmail` | Function | `src/lib/qseow/smtp/distribute-task-failed.js` | 11 |
| `sendDistributeTaskSuccessNotificationEmail` | Function | `src/lib/qseow/smtp/distribute-task-success.js` | 11 |
| `sendPreloadTaskFailureNotificationEmail` | Function | `src/lib/qseow/smtp/preload-task-failed.js` | 11 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandleFailedReloadTask → GetQRSHttpHeaders` | cross_community | 4 |
| `HandleFailedReloadTask → QrsClient` | cross_community | 4 |
| `HandleFailedReloadTask → Get` | cross_community | 4 |
| `HandleFailedPreloadTask → GetQRSHttpHeaders` | cross_community | 4 |
| `HandleFailedPreloadTask → QrsClient` | cross_community | 4 |
| `HandleFailedPreloadTask → Get` | cross_community | 4 |
| `HandleFailedPreloadTask → GetErrorMessage` | cross_community | 4 |
| `HandleFailedDistributeTask → GetQRSHttpHeaders` | cross_community | 4 |
| `HandleFailedDistributeTask → QrsClient` | cross_community | 4 |
| `HandleFailedDistributeTask → Get` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 33 calls |
| Qrs_util | 10 calls |
| Incident_mgmt | 5 calls |
| Influxdb | 1 calls |

## How to Explore

1. `gitnexus_context({name: "configFileStructureAssert"})` — see callers and callees
2. `gitnexus_query({query: "smtp"})` — find related execution flows
3. Read key files listed above for implementation details
