# Butler UDP Payload Format Documentation

## Overview

Butler exposes a UDP server that receives task event messages from Qlik Sense schedulers via custom log appenders. The UDP server listens on a configurable host and port (defined in `Butler.udpServerConfig.serverHost` and `Butler.udpServerConfig.portTaskFailure`) and processes incoming UDP messages containing task status information.

The UDP server is initialized in `src/butler.js` (lines 342-356) using Node.js `dgram` module with `udp4` socket type and `reuseAddr: false` option.

## UDP Message Format

All UDP messages are **semicolon (;) delimited strings** with no escaping mechanism. Fields cannot contain semicolons.

The message is parsed by splitting on `;`:

```javascript
const msg = message.toString().split(';');
```

## Message Types and Formats

Butler supports five distinct message types, each with a specific payload format and field count validation.

---

### 1. Engine Reload Failed (`/engine-reload-failed/`)

**Log appender pattern:**

```text
/engine-reload-failed/;%hostname;%property{AppId};%property{SessionId};%property{ActiveUserDirectory};%property{ActiveUserId};%date;%level;%message
```

**Expected field count:** Exactly **9 fields**

| Index | Field | Description | Example | Source |
|-------|-------|-------------|---------|--------|
| msg[0] | Message Type | Identifies the message type | `/engine-reload-failed/` | Hardcoded in log appender |
| msg[1] | Host Name | Qlik Sense server hostname | `sense-server-01` | `%hostname` |
| msg[2] | App ID | Qlik Sense app GUID | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | `%property{AppId}` |
| msg[3] | Session ID | Engine session identifier | `session-12345` | `%property{SessionId}` |
| msg[4] | Active User Directory | User directory for the active user | `DOMAIN` | `%property{ActiveUserDirectory}` |
| msg[5] | Active User ID | User ID for the active user | `jdoe` | `%property{ActiveUserId}` |
| msg[6] | Log Timestamp | Timestamp from the log system | `2026-05-06 14:23:45.123` | `%date` |
| msg[7] | Log Level | Log severity level | `ERROR` | `%level` |
| msg[8] | Log Message | The actual log message | `Script line 45: Field not found` | `%message` |

**Validation:**

- Field count must be exactly 9 (line 160 in `udp_handlers.js`)
- Message type is case-insensitive matched (line 155)

**Task type:** This message type does not have an associated task type - it comes directly from the Qlik Sense engine, not the scheduler.

---

### 2. Scheduler Reload Failed

**Supported message type identifiers (all treated identically):**

- `/scheduler-reload-failed/`
- `/scheduler-task-failed/`
- `/scheduler-reloadtask-failed/`

**Log appender pattern:**

```text
/scheduler-reload-failed/;%hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level;%property{ExecutionId};%message
```

**Expected field count:** Exactly **11 fields**

| Index | Field | Description | Example | Source |
|-------|-------|-------------|---------|--------|
| msg[0] | Message Type | Identifies the message type | `/scheduler-reload-failed/` | Hardcoded in log appender |
| msg[1] | Host Name | Qlik Sense server hostname | `sense-server-01` | `%hostname` |
| msg[2] | Task Name | Name of the failed task | `Daily Sales Reload` | `%property{TaskName}` |
| msg[3] | App Name | Name of the app being reloaded | `Sales Dashboard` | `%property{AppName}` |
| msg[4] | User | User who triggered the task (directory\username) | `DOMAIN\jdoe` | `%property{User}` |
| msg[5] | Task ID | GUID of the task | `f1e2d3c4-b5a6-7890-1234-567890abcdef` | `%property{TaskId}` |
| msg[6] | App ID | GUID of the app | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | `%property{AppId}` |
| msg[7] | Log Timestamp | Timestamp from the log system | `2026-05-06 14:23:45.123` | `%date` |
| msg[8] | Log Level | Log severity level | `ERROR` | `%level` |
| msg[9] | Execution ID | GUID for this execution instance | `e9f8a7b6-c5d4-3210-fedc-ba0987654321` | `%property{ExecutionId}` |
| msg[10] | Log Message | The actual log message | `Task failed after 3 retries` | `%message` |

**Validation:**

- Field count must be exactly 11 (line 200 in `udp_handlers.js`)
- Message type is case-insensitive matched (line 192-194)
- Task must exist in Qlik Sense (checked via `doesTaskExist()`)
- Task metadata is retrieved to determine actual task type (lines 62-73 in `scheduler_failed.js`)
- App metadata is retrieved for app-related tasks (lines 99-114 in `failed_reload.js`)

**Supported Task Types for Failed Tasks:**

| Task Type Code | Task Type | Handler | Notes |
|---------------|-----------|---------|-------|
| 0 | Reload | `handleFailedReloadTask` | Has associated app, script logs retrieved |
| 1 | External Program | `handleFailedExternalProgramTask` | No app ID or script logs |
| 2 | User Sync | `handleFailedUserSyncTask` | No app ID or script logs |
| 3 | Distribute | `handleFailedDistributeTask` | No app ID, handled via distribution queue |
| 4 | Preload | `handleFailedPreloadTask` | App-related task |

---

### 3. Scheduler Reload Aborted

**Supported message type identifiers (all treated identically):**

- `/scheduler-reload-aborted/`
- `/scheduler-task-aborted/`

**Log appender pattern:**

```text
/scheduler-reload-aborted/;%hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level;%property{ExecutionId};%message
```

**Expected field count:** Exactly **11 fields**

| Index | Field | Description | Example | Source |
|-------|-------|-------------|---------|--------|
| msg[0] | Message Type | Identifies the message type | `/scheduler-reload-aborted/` | Hardcoded in log appender |
| msg[1] | Host Name | Qlik Sense server hostname | `sense-server-01` | `%hostname` |
| msg[2] | Task Name | Name of the aborted task | `Daily Sales Reload` | `%property{TaskName}` |
| msg[3] | App Name | Name of the app being reloaded | `Sales Dashboard` | `%property{AppName}` |
| msg[4] | User | User who triggered the task (directory\username) | `DOMAIN\jdoe` | `%property{User}` |
| msg[5] | Task ID | GUID of the task | `f1e2d3c4-b5a6-7890-1234-567890abcdef` | `%property{TaskId}` |
| msg[6] | App ID | GUID of the app | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | `%property{AppId}` |
| msg[7] | Log Timestamp | Timestamp from the log system | `2026-05-06 14:23:45.123` | `%date` |
| msg[8] | Log Level | Log severity level | `WARN` | `%level` |
| msg[9] | Execution ID | GUID for this execution instance | `e9f8a7b6-c5d4-3210-fedc-ba0987654321` | `%property{ExecutionId}` |
| msg[10] | Log Message | The actual log message | `Task aborted by user` | `%message` |

**Validation:**

- Field count must be exactly 11 (line 215 in `udp_handlers.js`)
- Message type is case-insensitive matched (line 210)
- Task must exist in Qlik Sense (checked via `doesTaskExist()`)
- Task metadata is retrieved to determine actual task type

**Supported Task Types for Aborted Tasks:**

| Task Type Code | Task Type | Handler |
|---------------|-----------|---------|
| 0 | Reload | `handleAbortedReloadTask` |
| 1 | External Program | `handleAbortedExternalProgramTask` |
| 2 | User Sync | `handleAbortedUserSyncTask` |
| 3 | Distribute | `handleAbortedDistributeTask` |
| 4 | Preload | `handleAbortedPreloadTask` |

---

### 4. Scheduler Reload Task Success

**Supported message type identifiers (all treated identically):**

- `/scheduler-reloadtask-success/`
- `/scheduler-task-success/`

**Log appender pattern:**

```text
/scheduler-reloadtask-success/;%hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level;%property{ExecutionId};%message
```

**Expected field count:** Exactly **11 fields**

| Index | Field | Description | Example | Source |
|-------|-------|-------------|---------|--------|
| msg[0] | Message Type | Identifies the message type | `/scheduler-reloadtask-success/` | Hardcoded in log appender |
| msg[1] | Host Name | Qlik Sense server hostname | `sense-server-01` | `%hostname` |
| msg[2] | Task Name | Name of the successful task | `Daily Sales Reload` | `%property{TaskName}` |
| msg[3] | App Name | Name of the app being reloaded | `Sales Dashboard` | `%property{AppName}` |
| msg[4] | User | User who triggered the task (directory\username) | `DOMAIN\jdoe` | `%property{User}` |
| msg[5] | Task ID | GUID of the task | `f1e2d3c4-b5a6-7890-1234-567890abcdef` | `%property{TaskId}` |
| msg[6] | App ID | GUID of the app | `a1b2c3d4-e5f6-7890-abcd-ef1234567890` | `%property{AppId}` |
| msg[7] | Log Timestamp | Timestamp from the log system | `2026-05-06 14:23:45.123` | `%date` |
| msg[8] | Log Level | Log severity level | `INFO` | `%level` |
| msg[9] | Execution ID | GUID for this execution instance | `e9f8a7b6-c5d4-3210-fedc-ba0987654321` | `%property{ExecutionId}` |
| msg[10] | Log Message | The actual log message | `Task completed successfully` | `%message` |

**Validation:**

- Field count must be exactly 11 (line 231 in `udp_handlers.js`)
- Message type is case-insensitive matched (line 225)
- Task must exist in Qlik Sense (checked via `doesTaskExist()`)
- Task metadata is retrieved to determine actual task type
- For InfluxDB storage, execution results are retrieved with retry logic (up to 5 attempts with 1 second delay)

**Supported Task Types for Successful Tasks:**

| Task Type Code | Task Type | Handler | Script Log Retrieved |
|---------------|-----------|---------|---------------------|
| 0 | Reload | `handleSuccessReloadTask` | Yes (if notifications enabled) |
| 1 | External Program | `handleSuccessExternalProgramTask` | No |
| 2 | User Sync | `handleSuccessUserSyncTask` | No |
| 3 | Distribute | `handleSuccessDistributeTask` | No |
| 4 | Preload | `handleSuccessPreloadTask` | No |

---

### 5. Scheduler Distribute Task (`/scheduler-distribute/`)

**Log appender pattern:**

```text
/scheduler-distribute/;%hostname;%property{TaskName};%property{AppName};%property{User};%property{TaskId};%property{AppId};%date;%level;%property{ExecutionId};%message
```

**Expected field count:** At least **11 fields** (line 177 in `udp_handlers.js`)

| Index | Field | Description | Example | Source |
|-------|-------|-------------|---------|--------|
| msg[0] | Message Type | Identifies the message type | `/scheduler-distribute/` | Hardcoded in log appender |
| msg[1] | Host Name | Qlik Sense server hostname | `sense-server-01` | `%hostname` |
| msg[2] | Task Name | Name of the distribution task | `Distribute Sales App` | `%property{TaskName}` |
| msg[3] | (Unused) | Not used for distribute tasks | - | `%property{AppName}` |
| msg[4] | User | User who triggered the task (directory\username) | `DOMAIN\jdoe` | `%property{User}` |
| msg[5] | Task ID | GUID of the task | `f1e2d3c4-b5a6-7890-1234-567890abcdef` | `%property{TaskId}` |
| msg[6] | (Unused) | Not used for distribute tasks | - | `%property{AppId}` |
| msg[7] | Log Timestamp | Timestamp from the log system | `2026-05-06 14:23:45.123` | `%date` |
| msg[8] | Log Level | Log severity level | `INFO` | `%level` |
| msg[9] | Execution ID | GUID for this execution instance | `e9f8a7b6-c5d4-3210-fedc-ba0987654321` | `%property{ExecutionId}` |
| msg[10] | Log Message | Contains outcome information | `Distribution completed` | `%message` |
| msg[11+] | (Optional) | Additional fields allowed | - | - |

**Validation:**

- Field count must be at least 11 (line 177 in `udp_handlers.js`)
- Message type is case-insensitive matched (line 172)
- Task must exist in Qlik Sense (checked via `doesTaskExist()`)
- Task must be of type 3 (Distribute) - validated in `distribute_task_completion.js` lines 57-73
- Task metadata is retrieved to check execution status

**Distribution Task States:**

Distribution tasks can be in intermediate states that require queue-based monitoring:

| State Code | State Name | Type | Action |
|------------|------------|------|--------|
| 0 | NeverStarted | Initial | - |
| 1 | Triggered | Intermediate | Add to queue |
| 2 | Started | Intermediate | Add to queue |
| 3 | Queued | Intermediate | Add to queue |
| 4 | AbortInitiated | Intermediate | Add to queue |
| 5 | Aborting | Intermediate | Add to queue |
| 6 | Aborted | Final | Call `handleFailedDistributeTask` |
| 7 | FinishedSuccess | Final | Call `handleSuccessDistributeTask` |
| 8 | FinishedFail | Final | Call `handleFailedDistributeTask` |
| 9 | Skipped | Final | - |
| 10 | Retry | Intermediate | Add to queue |
| 11 | Error | Final | Call `handleFailedDistributeTask` |
| 12 | Reset | - | - |
| 13 | DistributionQueue | Intermediate | Add to queue |
| 14 | DistributionRunning | Intermediate | Add to queue |

**Distribution Queue:**

- Queue polling interval: 30 seconds (from `DISTRIBUTION_QUEUE_POLL_INTERVAL_MS` constant)
- Maximum queue age: 6 hours (from `DISTRIBUTION_QUEUE_MAX_AGE_MS` constant)
- Tasks in intermediate states are added to `DistributionTaskQueue` and checked periodically
- Queue stops polling when empty

---

## Field Details and Constraints

### Message Type Identifier (msg[0])

- **Required:** Yes
- **Case sensitivity:** Case-insensitive comparison (using `.toLowerCase()`)
- **Valid values:**
  - `/engine-reload-failed/`
  - `/scheduler-reload-failed/`
  - `/scheduler-task-failed/`
  - `/scheduler-reloadtask-failed/`
  - `/scheduler-reload-aborted/`
  - `/scheduler-task-aborted/`
  - `/scheduler-reloadtask-success/`
  - `/scheduler-task-success/`
  - `/scheduler-distribute/`
- **Unknown message types:** Logged as warning (line 241 in `udp_handlers.js`), message is discarded

### Host Name (msg[1])

- **Source:** `%hostname` (Qlik Sense log appender variable)
- **Format:** String, hostname of the Qlik Sense server
- **Validation:** None explicit, but used in notifications and logging

### Task Name (msg[2])

- **Source:** `%property{TaskName}` (Qlik Sense log appender variable)
- **Format:** String, human-readable task name
- **Validation:** None explicit, but used in notifications and logging
- **Note:** For external program and user sync tasks, this is still present but there is no associated app

### App Name (msg[3])

- **Source:** `%property{AppName}` (Qlik Sense log appender variable)
- **Format:** String, human-readable app name
- **Present for:** Reload tasks, Preload tasks
- **Not used for:** External program tasks, User sync tasks, Distribute tasks
- **Validation:** For reload tasks, app metadata is retrieved and validated (lines 99-114 in `failed_reload.js`)

### User (msg[4])

- **Source:** `%property{User}` (Qlik Sense log appender variable)
- **Format:** `directory\username` or `DOMAIN\user`
- **Validation:** Backslashes are replaced with forward slashes in some notification channels: `msg[4].replace(/\\/g, '/')`
- **Note:** In MQTT full payload, backslashes are doubled: `msg[4].replace(/\\\\/g, '\\')`

### Task ID (msg[5])

- **Source:** `%property{TaskId}` (Qlik Sense log appender variable)
- **Format:** GUID (36 characters with hyphens)
- **Validation:**
  - Task existence is verified via QRS API (`doesTaskExist()`)
  - Task metadata is retrieved via QRS API (`getTaskMetadata()`)
  - If task doesn't exist: warning logged, processing aborted
  - If metadata retrieval fails: error logged, processing aborted

### App ID (msg[6])

- **Source:** `%property{AppId}` (Qlik Sense log appender variable)
- **Format:** GUID (36 characters with hyphens)
- **Present for:** Reload tasks, Preload tasks
- **Not used for:** External program tasks, User sync tasks, Distribute tasks
- **Validation:** For reload tasks, app metadata is retrieved and validated

### Log Timestamp (msg[7])

- **Source:** `%date` (Qlik Sense log appender variable)
- **Format:** Typically `YYYY-MM-DD HH:MM:SS.mmm`
- **Validation:** None explicit

### Log Level (msg[8])

- **Source:** `%level` (Qlik Sense log appender variable)
- **Format:** String - `INFO`, `WARN`, `ERROR`, etc.
- **Validation:** None explicit

### Execution ID (msg[9])

- **Source:** `%property{ExecutionId}` (Qlik Sense log appender variable)
- **Format:** GUID (36 characters with hyphens)
- **Validation:** None explicit
- **Note:** Used to correlate execution results for InfluxDB storage

### Log Message (msg[10])

- **Source:** `%message` (Qlik Sense log appender variable)
- **Format:** String, the actual log message content
- **Validation:** None explicit
- **For distribute tasks:** Contains outcome information used to determine success/failure

---

## Validations and Safety Checks

### 1. Field Count Validation

Performed in `src/udp/udp_handlers.js`:

| Message Type | Expected Count | Operator | Line |
|--------------|----------------|----------|------|
| `/engine-reload-failed/` | 9 | `===` (exact) | 160 |
| `/scheduler-distribute/` | 11 | `<` (minimum) | 177 |
| `/scheduler-reload-failed/` (and variants) | 11 | `===` (exact) | 200 |
| `/scheduler-reload-aborted/` (and variants) | 11 | `===` (exact) | 215 |
| `/scheduler-reloadtask-success/` (and variants) | 11 | `===` (exact) | 231 |

**On validation failure:**

- Warning logged with expected vs actual field count
- Full message content logged for debugging
- Processing aborted (return)

### 2. Task Existence Validation

Performed in router handlers (`scheduler_failed.js`, `scheduler_success.js`, `scheduler_aborted.js`, `distribute_task_completion.js`):

```javascript
const taskExists = await doesTaskExist(reloadTaskId);
if (taskExists.exists !== true) {
    globals.logger.warn(`[QSEOW] TASKFAILURE: Task ID ${reloadTaskId} does not exist in Sense`);
    return false;
}
```

### 3. Task Metadata Validation

```javascript
const taskMetadata = await getTaskMetadata(msg[5]);
if (taskMetadata === false) {
    globals.logger.error(`[QSEOW] TASKFAILURE: Could not get task metadata for task ${msg[5]}. Aborting further processing`);
    return;
}
```

### 4. Task Type Validation (Distribute Tasks)

In `distribute_task_completion.js` lines 57-73:

```javascript
if (taskType !== 3) {
    // Not a distribute task - log warning and abort
    return false;
}
```

### 5. App Metadata Validation (Reload Tasks)

In `failed_reload.js` lines 103-114:

```javascript
if (appMetadata === false) {
    // Error getting metadata
    return;
}
if (!appMetadata || Object.keys(appMetadata).length === 0) {
    // App not found or empty metadata
    return;
}
```

---

## Limitations and Restrictions

### 1. Configured Payload Size Limit

- Butler validates incoming UDP message size against the configured `udpMaxMessageSize` setting
- The default maximum message size is `65507` bytes
- Messages larger than `udpMaxMessageSize` are rejected and will not be processed
- Theoretical UDP payload limit is still approximately 65,507 bytes for IPv4 and 65,527 bytes for IPv6, but Butler enforces the configured limit before parsing the payload

### 2. Semicolon Delimiter

- Fields are separated by semicolons (`;`)
- **Fields cannot contain semicolons** - there is no escaping mechanism
- A semicolon in any field will cause incorrect field parsing and validation failure

### 3. No Message Integrity Checks

- No checksums or validation of message integrity
- UDP is inherently unreliable - messages may be lost, duplicated, or arrive out of order
- Butler does not implement any deduplication or ordering logic

### 4. No Authentication or Authorization

- No authentication tokens or signatures are included in the protocol
- By default, UDP messages are accepted without source validation
- If `enableSourceValidation` is enabled, Butler validates the sender source IP against `allowedSources`
- When source validation is enabled, messages from sources not listed in `allowedSources` are rejected and not processed
- **Security note:** In production, consider network-level controls (firewall rules) as defense in depth, even when source validation is enabled

### 5. String Conversion

- Message is converted to string using `message.toString()` (line 153 in `udp_handlers.js`)
- No character encoding specification (defaults to UTF-8)
- Binary data or non-UTF-8 encoded messages may cause issues

### 6. Case Sensitivity

- Message type identifiers are compared case-insensitively (using `.toLowerCase()`)
- Field content (task names, app names, etc.) is case-sensitive as per Qlik Sense

### 7. Task Type Dependency

- For most message types, the task type is determined by querying Qlik Sense QRS API
- If QRS is unavailable or returns errors, message processing fails
- Task type is determined from `taskMetadata.taskType` with fallback to `0` (Reload)

---

## Configuration

### UDP Server Configuration

Defined in `Butler.udpServerConfig` (validated by schema in `src/lib/assert/config-file-schema.js` lines 3037-3048):

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `enable` | boolean | Yes | Enable/disable UDP server |
| `serverHost` | string (hostname format) | Yes | Host/IP to bind UDP server to |
| `portTaskFailure` | number | Yes | Port to listen on for UDP messages |
| `maxMessageSize` | number | Yes | Maximum UDP payload size in bytes |
| `enableSourceValidation` | boolean | Yes | Enable source IP allowlist validation |
| `allowedSources` | array of strings | Yes | Allowed source IPv4/hostnames used when source validation is enabled |
| `messageQueue.maxConcurrent` | number | Yes | Max number of concurrent message processors |
| `messageQueue.maxSize` | number | Yes | Max queue size before incoming messages are dropped |
| `messageQueue.backpressureThreshold` | number | Yes | Queue utilization threshold (percent) for backpressure warnings |
| `rateLimit.enable` | boolean | Yes | Enable or disable rate limiting |
| `rateLimit.maxMessagesPerMinute` | number | Yes | Maximum messages accepted per minute when rate limiting is enabled |
| `queueMetrics.influxdb.enable` | boolean | Yes | Enable writing queue metrics to InfluxDB |
| `queueMetrics.influxdb.writeFrequency` | number | Yes | Queue metrics write interval (ms) |
| `queueMetrics.influxdb.measurementName` | string | Yes | Measurement name for queue metrics in InfluxDB |

### Example Configuration

```yaml
Butler:
  udpServerConfig:
    enable: true
    serverHost: "0.0.0.0"
    portTaskFailure: 9998
    maxMessageSize: 65507
    enableSourceValidation: false
    allowedSources: []
    messageQueue:
      maxConcurrent: 10
      maxSize: 200
      backpressureThreshold: 80
    rateLimit:
      enable: false
      maxMessagesPerMinute: 600
    queueMetrics:
      influxdb:
        enable: false
        writeFrequency: 20000
        measurementName: butler_udp_queue
        tags: []
```

---

## Notification Channels

Depending on the message type and task type, the following notification channels may be triggered:

### For Failed Tasks

- Signl4 incident management
- New Relic (events and logs)
- InfluxDB metrics
- Slack messages
- Microsoft Teams messages
- Email notifications
- Webhook calls
- MQTT messages (basic and full payload)

### For Successful Tasks

- InfluxDB metrics (with execution duration)
- Email notifications (with script logs if enabled)

### For Aborted Tasks

- Signl4 incident management
- New Relic (events and logs)
- Slack messages
- Microsoft Teams messages
- Email notifications
- Webhook calls
- MQTT messages (basic and full payload)

### For Distribute Tasks

- InfluxDB metrics
- Email notifications (for success)

**Note:** Notification channels are conditionally enabled based on Butler configuration. Each channel has its own enable flag.

---

## Error Handling

### UDP Server Errors

Handled in `udp_handlers.js` lines 59-79:

- Server-level errors are caught and logged
- MQTT status message published if configured (`taskFailureServerStatusTopic`)

### Message Processing Errors

Handled in `udp_handlers.js` lines 243-248:

```javascript
try {
    // message processing
} catch (err) {
    globals.logger.error(`[QSEOW] UDP HANDLER: Failed processing log event. No action will be taken for this event. Error: ${globals.getErrorMessage(err)}`);
    globals.logger.error(`[QSEOW] UDP HANDLER: Incoming log message was\n${message}`);
}
```

### Unknown Message Types

Logged as warning (line 241):

```javascript
globals.logger.warn(`[QSEOW] UDP HANDLER: Unknown UDP message type: "${msg[0]}"`);
```

---

## Code References

| Component | File Path | Key Lines |
|-----------|-----------|-----------|
| UDP Server Setup | `src/butler.js` | 342-356 |
| UDP Handlers | `src/udp/udp_handlers.js` | 1-252 |
| Failed Task Router | `src/udp/handlers/scheduler_failed.js` | 1-121 |
| Success Task Router | `src/udp/handlers/scheduler_success.js` | 1-127 |
| Aborted Task Router | `src/udp/handlers/scheduler_aborted.js` | 1-122 |
| Distribute Task Handler | `src/udp/handlers/distribute_task_completion.js` | 1-114 |
| Distribution Queue | `src/udp/handlers/distribution_queue.js` | 1-266 |
| Failed Reload Handler | `src/udp/handlers/task_types/failed_reload.js` | 1-406 |
| Success Reload Handler | `src/udp/handlers/task_types/success_reload.js` | 1-296 |
| Failed External Program Handler | `src/udp/handlers/task_types/failed_externalprogram.js` | 1-84 |
| Success External Program Handler | `src/udp/handlers/task_types/success_externalprogram.js` | 1-178 |
| Failed User Sync Handler | `src/udp/handlers/task_types/failed_usersync.js` | 1-82 |
| Success User Sync Handler | `src/udp/handlers/task_types/success_usersync.js` | 1-170 |
| Failed Distribute Handler | `src/udp/handlers/task_types/failed_distribute.js` | - |
| Success Distribute Handler | `src/udp/handlers/task_types/success_distribute.js` | 1-176 |
| Configuration Schema | `src/lib/assert/config-file-schema.js` | 3037-3048 |
| Global Variables | `src/globals.js` | 497-500 |
| Constants | `src/constants.js` | DISTRIBUTION_QUEUE_* |
| Unit Tests | `src/udp/__tests__/udp_handlers.test.js` | 1-372 |

---

## Recommended Actions

Based on comparison with Butler SOS's hardened UDP server, the following improvements are recommended. Deferred items (UDP rate limiting, queue management, deduplication) are excluded per current requirements.

### Completed Actions

1. ~~**Change `reuseAddr` to `false`** (`src/butler.js:345`)~~
   - **Implemented:** 2026-05-07
   - **Change:** `reuseAddr: true` → `reuseAddr: false`
   - **Effect:** Prevents port hijacking by multiple processes
   - **Verification:** Lint passed, 11/11 UDP handler tests passed
   - **Butler SOS reference:** `butler-sos/src/lib/globals/udp-servers.js:24,48`

2. ~~**Add payload size limits** (`src/udp/udp_handlers.js`)~~
   - **Implemented:** 2026-05-07
   - **Change:** Added `maxMessageSize` config (no default, required in config)
   - **Files modified:** `config-file-schema.js`, `globals.js`, `udp_handlers.js`, `production_template.yaml`, `config-gen-api-docs.yaml`
   - **Effect:** Rejects UDP messages exceeding configured maximum size
   - **Verification:** Lint passed, 12/12 UDP handler tests passed (including new oversized message test)
   - **Butler SOS reference:** `butler-sos/src/lib/udp-queue-manager.js:255-258`

3. ~~**Add source IP allowlisting** (`src/udp/udp_handlers.js`)~~
   - **Implemented:** 2026-05-07
   - **Change:** Added `enableSourceValidation` and `allowedSources` config, `udp_ip_validator.js` utility
   - **Files modified:** `config-file-schema.js`, `globals.js`, `udp_handlers.js`, `udp_ip_validator.js`, `production_template.yaml`, `config-gen-api-docs.yaml`
   - **Effect:** Rejects UDP messages from unauthorized source IPs/hostnames
   - **Verification:** Lint passed (0 errors), 15/15 UDP handler tests passed
   - **Documentation:** See `docs/completed_work/SOURCE_IP_ALLOWLIST.md`

4. ~~**Add UUID validation for Task ID and App ID** (`src/udp/udp_handlers.js`)~~
   - **Implemented:** 2026-05-07
   - **Change:** Added `guidRegex` export to `guid_util.js`, added UUID validation in `udp_handlers.js` for `msg[5]` (Task ID) and `msg[6]` (App ID)
   - **Files modified:** `guid_util.js`, `udp_handlers.js`, `udp/__tests__/udp_handlers.test.js`
   - **Effect:** Rejects messages with invalid GUID formats, reduces unnecessary QRS API calls
   - **Verification:** Lint passed (0 errors), 15/15 UDP handler tests passed
   - **Butler SOS reference:** `butler-sos/src/lib/udp_handlers/log_events/utils/common-utils.js:38`

5. ~~**Add input sanitization** (`src/udp/udp_handlers.js` and all handler files)~~
   - **Implemented:** 2026-05-07
   - **Change:** Created `src/lib/udp_sanitizer.js` with `sanitizeField()` and `sanitizeMessage()` functions; integrated into `udp_handlers.js` after message parse
   - **Files modified:** `udp_sanitizer.js` (new), `udp_handlers.js`, `udp/__tests__/udp_handlers.test.js`
   - **Effect:** Removes control characters (ASCII 0x00-0x1F, 0x7F) and enforces 500-char max field length
   - **Verification:** Lint passed (0 errors), 20/20 UDP handler tests passed (5 new sanitization tests)
   - **Butler SOS reference:** `butler-sos/src/lib/udp-queue-manager.js:172-180`

---

### Priority2: Important (Implement Soon)

 6. **Add monitoring metrics** (`src/udp/udp_handlers.js`)
   - Track counts: messages received, rejected (size/IP), processed successfully
   - Export metrics to InfluxDB for visibility into UDP server health
   - Effort: Medium
   - Butler SOS reference: `butler-sos/src/lib/udp-queue-manager.js` (dropped message counters)

### Deferred Items (Not Implemented at This Time)

- UDP rate limiting
- Queue management
- Deduplication
- **Message authentication (HMAC signatures)**
   - Add HMAC-SHA256 signatures to UDP payloads for integrity/authenticity
   - Requires modifying Qlik Sense log appenders to include signatures
   - Breaks backward compatibility with existing deployments
   - Effort: High | Impact: Evaluate carefully

### Implementation Priority Summary

| # | Action | Priority | Effort | Security Impact | Status |
|---|--------|----------|--------|-----------------|--------|
| ~~1~~ | ~~Change `reuseAddr` to `false`~~ | ~~HIGH~~ | ~~Trivial~~ | ~~Medium~~ | ✅ Done (2026-05-07) |
| ~~2~~ | ~~Add payload size limits~~ | ~~HIGH~~ | ~~Low~~ | ~~Medium~~ | ✅ Done (2026-05-07) |
| ~~3~~ | ~~Add source IP allowlisting~~ | ~~HIGH~~ | ~~Low~~ | ~~High~~ | ✅ Done (2026-05-07) |
| ~~4~~ | ~~UUID validation~~ | ~~MEDIUM~~ | ~~Low~~ | ~~Low~~ | ✅ Done (2026-05-07) |
| ~~5~~ | ~~Input sanitization~~ | ~~MEDIUM~~ | ~~Low~~ | ~~Medium~~ | ✅ Done (2026-05-07) |
| 6 | Monitoring metrics | LOW | Medium | Medium | Pending |
