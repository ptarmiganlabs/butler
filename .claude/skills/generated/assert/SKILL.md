---
name: assert
description: "Skill for the Assert area of butler. 11 symbols across 4 files."
---

# Assert

11 symbols | 4 files | Cohesion: 48%

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
| `src/lib/qseow/qliksense_version.js` | setupQlikSenseVersionMonitor |

## Entry Points

Start here when exploring this area:

- **`configFileQsAssert`** (Function) — `src/lib/assert/assert_config_file.js:25`
- **`configFileEmailAssert`** (Function) — `src/lib/assert/assert_config_file.js:82`
- **`configFileInfluxDbAssert`** (Function) — `src/lib/assert/assert_config_file.js:211`
- **`configFileAppAssert`** (Function) — `src/lib/assert/assert_config_file.js:682`
- **`configFileConditionalAssert`** (Function) — `src/lib/assert/assert_config_file.js:824`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `configFileQsAssert` | Function | `src/lib/assert/assert_config_file.js` | 25 |
| `configFileEmailAssert` | Function | `src/lib/assert/assert_config_file.js` | 82 |
| `configFileInfluxDbAssert` | Function | `src/lib/assert/assert_config_file.js` | 211 |
| `configFileAppAssert` | Function | `src/lib/assert/assert_config_file.js` | 682 |
| `configFileConditionalAssert` | Function | `src/lib/assert/assert_config_file.js` | 824 |
| `setupQlikSenseAccessLicenseMonitor` | Function | `src/lib/qseow/qliksense_license.js` | 918 |
| `setupQlikSenseLicenseRelease` | Function | `src/lib/qseow/qliksense_license.js` | 945 |
| `setupQlikSenseServerLicenseMonitor` | Function | `src/lib/qseow/qliksense_license.js` | 972 |
| `setupQlikSenseVersionMonitor` | Function | `src/lib/qseow/qliksense_version.js` | 71 |
| `start` | Function | `src/butler.js` | 47 |
| `sleepLocal` | Function | `src/butler.js` | 150 |

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
| Qseow | 8 calls |
| Qrs_util | 6 calls |
| Incident_mgmt | 4 calls |
| Influxdb | 1 calls |

## How to Explore

1. `gitnexus_context({name: "configFileQsAssert"})` — see callers and callees
2. `gitnexus_query({query: "assert"})` — find related execution flows
3. Read key files listed above for implementation details
