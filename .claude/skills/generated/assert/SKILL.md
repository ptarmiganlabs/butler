---
name: assert
description: "Skill for the Assert area of butler. 13 symbols across 5 files."
---

# Assert

13 symbols | 5 files | Cohesion: 50%

## When to Use

- Working with code in `src/`
- Understanding how configFileQsAssert, configFileEmailAssert, configFileInfluxDbAssert work
- Modifying assert-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `src/lib/assert/assert_config_file.js` | configFileQsAssert, configFileEmailAssert, configFileInfluxDbAssert, configFileAppAssert, configFileConditionalAssert |
| `src/lib/qseow/qliksense_license.js` | setupQlikSenseAccessLicenseMonitor, setupQlikSenseLicenseRelease, setupQlikSenseServerLicenseMonitor |
| `src/butler.js` | start, sleepLocal |
| `src/lib/scheduler.js` | startAllSchedules, startSchedule |
| `src/routes/rest_server/scheduler.js` | handlerPUTSchedulesStart |

## Entry Points

Start here when exploring this area:

- **`configFileQsAssert`** (Function) — `src/lib/assert/assert_config_file.js:26`
- **`configFileEmailAssert`** (Function) — `src/lib/assert/assert_config_file.js:83`
- **`configFileInfluxDbAssert`** (Function) — `src/lib/assert/assert_config_file.js:212`
- **`configFileAppAssert`** (Function) — `src/lib/assert/assert_config_file.js:703`
- **`configFileConditionalAssert`** (Function) — `src/lib/assert/assert_config_file.js:845`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `configFileQsAssert` | Function | `src/lib/assert/assert_config_file.js` | 26 |
| `configFileEmailAssert` | Function | `src/lib/assert/assert_config_file.js` | 83 |
| `configFileInfluxDbAssert` | Function | `src/lib/assert/assert_config_file.js` | 212 |
| `configFileAppAssert` | Function | `src/lib/assert/assert_config_file.js` | 703 |
| `configFileConditionalAssert` | Function | `src/lib/assert/assert_config_file.js` | 845 |
| `setupQlikSenseAccessLicenseMonitor` | Function | `src/lib/qseow/qliksense_license.js` | 953 |
| `setupQlikSenseLicenseRelease` | Function | `src/lib/qseow/qliksense_license.js` | 976 |
| `setupQlikSenseServerLicenseMonitor` | Function | `src/lib/qseow/qliksense_license.js` | 999 |
| `startAllSchedules` | Function | `src/lib/scheduler.js` | 131 |
| `startSchedule` | Function | `src/lib/scheduler.js` | 272 |
| `start` | Function | `src/butler.js` | 47 |
| `sleepLocal` | Function | `src/butler.js` | 150 |
| `handlerPUTSchedulesStart` | Function | `src/routes/rest_server/scheduler.js` | 137 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `HandlerPUTSchedulesStart → CheckFileExistsSync` | cross_community | 5 |
| `HandlerPUTSchedulesStart → GetEnabledApiEndpoints` | cross_community | 5 |
| `HandlerPUTSchedulesStart → Has` | cross_community | 5 |
| `HandlerPUTSchedulesStart → GetErrorMessage` | cross_community | 5 |
| `Start → GetErrorMessage` | cross_community | 5 |
| `SetupServiceMonitorTimer → CheckFileExistsSync` | cross_community | 4 |
| `SetupServiceMonitorTimer → GetEnabledApiEndpoints` | cross_community | 4 |
| `SetupServiceMonitorTimer → Has` | cross_community | 4 |
| `SetupServiceMonitorTimer → GetErrorMessage` | cross_community | 4 |
| `Start → Validate` | cross_community | 4 |

## Connected Areas

| Area | Connections |
|------|-------------|
| Qseow | 10 calls |
| Qrs_util | 5 calls |
| Incident_mgmt | 4 calls |
| Rest_server | 4 calls |
| Influxdb | 2 calls |

## How to Explore

1. `gitnexus_context({name: "configFileQsAssert"})` — see callers and callees
2. `gitnexus_query({query: "assert"})` — find related execution flows
3. Read key files listed above for implementation details
