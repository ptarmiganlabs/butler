# UDP Message Deduplication Fix

## Problem Description

When a Qlik Sense reload task fails and sends a UDP message to Butler, users observed confusing log entries showing both "Sending email" and "Rate limiting failed" messages for the same recipients:

```
2026-06-17T09:33:01.531Z info: EMAIL RELOAD TASK FAILED ALERT: Sending reload task failed notification email to qlik@company.com
2026-06-17T09:33:01.539Z info: EMAIL RELOAD TASK FAILED ALERT: Sending reload task failed notification email to anna@company.com
2026-06-17T09:33:01.630Z warn: EMAIL RELOAD TASK FAILED ALERT: Rate limiting failed. Not sending reload notification email for task "Test Always fail" to "qlik@company.com"
2026-06-17T09:33:01.630Z warn: EMAIL RELOAD TASK FAILED ALERT: Rate limiting failed. Not sending reload notification email for task "Test Always fail" to "anna@company.com"
```

## Root Cause Analysis

### Issue 1: Duplicate UDP Messages

Qlik Sense can send multiple UDP messages for the same task failure event, especially when multiple log appenders are configured (e.g., `/scheduler-reload-failed/`, `/scheduler-task-failed/`, `/scheduler-reloadtask-failed/`). Each message triggered a complete notification flow, causing duplicate processing.

### Issue 2: Confusing Log Messages

The rate limiter log messages were misleading:

- "Sending email" appeared inside the `.then()` block, making it look like emails were being sent even when they weren't
- "Rate limiting failed" suggested an error rather than normal rate limit behavior

## Solution

### 1. UDP Message Deduplication

Added a deduplication mechanism in `src/lib/udp_queue_manager.js` that tracks processed `executionId` values (from UDP message field 9) using a time-based cache with a 10-minute TTL.

**Key changes:**

- Added `DeduplicationCache` class with automatic cleanup of expired entries
- Added `checkDuplicate(executionId)` method to detect and mark duplicates
- Integrated deduplication check in `src/udp/udp_handlers.js` before message processing
- Added metrics tracking for dropped duplicate messages

**How it works:**

1. When a UDP message arrives, the handler extracts the `executionId` from field 9
2. The `checkDuplicate()` method checks if this ID was seen in the last 10 minutes
3. If duplicate, the message is skipped and counted in metrics
4. If new, the ID is cached and processing continues normally

### 2. Improved Rate Limiter Log Messages

Updated all email notification files to provide clearer logging:

**Before:**

```javascript
globals.logger.info(`... Sending reload task failed notification email to ${recipientEmailAddress}...`);
globals.logger.debug(`... Rate limiting details "${JSON.stringify(rateLimiterRes, null, 2)}"`);
// ... later in catch block ...
globals.logger.warn(`... Rate limiting failed. Not sending reload notification email...`);
```

**After:**

```javascript
globals.logger.debug(`... Rate limit check passed for ${recipientEmailAddress}... Remaining points: ${rateLimiterRes.remainingPoints}`);
globals.logger.info(`... Sending reload task failed notification email to ${recipientEmailAddress}...`);
// ... later in catch block ...
globals.logger.warn(
    `... Rate limit exceeded. Not sending reload notification email... Wait before sending another email to this recipient for this task.`,
);
```

**Key improvements:**

- Debug log now shows rate limit check passed with remaining points
- Info log clearly indicates email is being sent (after rate limit check)
- Warning log explains rate limit was exceeded and suggests waiting

### 3. Files Modified

**Core deduplication:**

- `src/lib/udp_queue_manager.js` - Added `DeduplicationCache` class and deduplication methods
- `src/udp/udp_handlers.js` - Added duplicate check before message processing

**Email notification log improvements:**

- `src/lib/qseow/smtp/reload-task-failed.js`
- `src/lib/qseow/smtp/reload-task-aborted.js`
- `src/lib/qseow/smtp/reload-task-success.js`
- `src/lib/qseow/smtp/preload-task-failed.js`
- `src/lib/qseow/smtp/preload-task-success.js`
- `src/lib/qseow/smtp/distribute-task-failed.js`
- `src/lib/qseow/smtp/distribute-task-success.js`
- `src/lib/qseow/smtp/service-monitor.js`

## Configuration

The deduplication cache uses a fixed 10-minute TTL. This is appropriate because:

- Task executions typically complete within minutes
- Duplicate UDP messages arrive within seconds of each other
- 10 minutes provides a safe buffer without consuming excessive memory

No configuration changes are required. The deduplication is always active.

## Metrics

New metrics are now available in the UDP queue manager:

- `messagesDroppedDuplicate` - Count of messages dropped due to duplicate detection
- `deduplicationCacheSize` - Current number of entries in the deduplication cache

These metrics can be exported to InfluxDB for monitoring.

## Testing

To verify the fix:

1. Configure multiple log appenders in Qlik Sense that send different message types for the same failure
2. Trigger a task failure
3. Check Butler logs - you should see only one set of "Sending email" messages
4. Check debug logs for "Duplicate message detected" entries if duplicates were sent

## Backward Compatibility

This change is fully backward compatible:

- No configuration changes required
- No API changes
- Existing rate limiting behavior is preserved
- Only adds deduplication at the UDP message level
