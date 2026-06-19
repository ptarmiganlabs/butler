---
name: qscloud
description: "Skill for the Qscloud area of butler. 12 symbols across 6 files."
---

# Qscloud

12 symbols | 6 files | Cohesion: 69%

## When to Use

- Working with code in `src/`
- Understanding how getQlikSenseCloudAppReloadScriptLogHead, getQlikSenseCloudAppReloadScriptLogTail, getQlikSenseCloudUserInfo work
- Modifying qscloud-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/qscloud/msteams_notification_qscloud.js` | getAppReloadFailedTeamsConfig, sendTeams, sendQlikSenseCloudAppReloadFailureNotificationTeams |
| `src/lib/qscloud/slack_notification_qscloud.js` | getAppReloadFailedSlackConfig, sendQlikSenseCloudAppReloadFailureNotificationSlack, escapeForJson |
| `src/lib/qscloud/api/appreloadinfo.js` | getQlikSenseCloudAppReloadScriptLogHead, getQlikSenseCloudAppReloadScriptLogTail |
| `src/lib/qscloud/email_notification_qscloud.js` | getAppReloadFailedEmailConfig, sendQlikSenseCloudAppReloadFailureNotificationEmail |
| `src/lib/qscloud/api/user.js` | getQlikSenseCloudUserInfo |
| `src/lib/qscloud/util.js` | getQlikSenseCloudUrls |

## Entry Points

Start here when exploring this area:

- **`getQlikSenseCloudAppReloadScriptLogHead`** (Function) — `src/lib/qscloud/api/appreloadinfo.js:51`
- **`getQlikSenseCloudAppReloadScriptLogTail`** (Function) — `src/lib/qscloud/api/appreloadinfo.js:69`
- **`getQlikSenseCloudUserInfo`** (Function) — `src/lib/qscloud/api/user.js:11`
- **`sendQlikSenseCloudAppReloadFailureNotificationEmail`** (Function) — `src/lib/qscloud/email_notification_qscloud.js:119`
- **`sendQlikSenseCloudAppReloadFailureNotificationTeams`** (Function) — `src/lib/qscloud/msteams_notification_qscloud.js:231`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `getQlikSenseCloudAppReloadScriptLogHead` | Function | `src/lib/qscloud/api/appreloadinfo.js` | 51 |
| `getQlikSenseCloudAppReloadScriptLogTail` | Function | `src/lib/qscloud/api/appreloadinfo.js` | 69 |
| `getQlikSenseCloudUserInfo` | Function | `src/lib/qscloud/api/user.js` | 11 |
| `sendQlikSenseCloudAppReloadFailureNotificationEmail` | Function | `src/lib/qscloud/email_notification_qscloud.js` | 119 |
| `sendQlikSenseCloudAppReloadFailureNotificationTeams` | Function | `src/lib/qscloud/msteams_notification_qscloud.js` | 231 |
| `sendQlikSenseCloudAppReloadFailureNotificationSlack` | Function | `src/lib/qscloud/slack_notification_qscloud.js` | 212 |
| `escapeForJson` | Function | `src/lib/qscloud/slack_notification_qscloud.js` | 366 |
| `getQlikSenseCloudUrls` | Function | `src/lib/qscloud/util.js` | 6 |
| `getAppReloadFailedEmailConfig` | Function | `src/lib/qscloud/email_notification_qscloud.js` | 39 |
| `getAppReloadFailedTeamsConfig` | Function | `src/lib/qscloud/msteams_notification_qscloud.js` | 41 |
| `sendTeams` | Function | `src/lib/qscloud/msteams_notification_qscloud.js` | 97 |
| `getAppReloadFailedSlackConfig` | Function | `src/lib/qscloud/slack_notification_qscloud.js` | 40 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `SendQlikSenseCloudAppReloadFailureNotificationEmail → GetErrorMessage` | cross_community | 3 |
| `SendQlikSenseCloudAppReloadFailureNotificationSlack → Has` | cross_community | 3 |
| `SendQlikSenseCloudAppReloadFailureNotificationSlack → GetErrorMessage` | cross_community | 3 |
| `SendQlikSenseCloudAppReloadFailureNotificationTeams → GetErrorMessage` | cross_community | 3 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 9 calls |
| Smtp | 2 calls |
| Incident_mgmt | 1 calls |

## How to Explore

1. `gitnexus_context({name: "getQlikSenseCloudAppReloadScriptLogHead"})` — see callers and callees
2. `gitnexus_query({query: "qscloud"})` — find related execution flows
3. Read key files listed above for implementation details
