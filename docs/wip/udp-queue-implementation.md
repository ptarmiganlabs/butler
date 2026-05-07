# UDP Queue Management Implementation - WIP Plan

## Goal
Harden Butler's UDP server by adding input sanitization, UUID validation, and UDP queue management with rate limiting and metrics (matching Butler SOS).

## Status: COMPLETED ✅

## Implementation Tasks

### Completed
- [x] Change `reuseAddr` from `true` to `false` in `src/butler.js:345`
- [x] Add payload size limits with `maxMessageSize` config
- [x] Create `src/lib/udp_ip_validator.js` for source IP validation
- [x] Add source IP allowlisting (`enableSourceValidation`, `allowedSources`)
- [x] Add UUID validation exports (`guidRegex`) to `src/lib/guid_util.js`
- [x] Add UUID validation for Task ID (`msg[5]`) and App ID (`msg[6]`)
- [x] Create `src/lib/udp_sanitizer.js` with `sanitizeField()` and `sanitizeMessage()`
- [x] Add input sanitization (control char removal, 500-char max)
- [x] Install `p-queue ^9.2.0` and `async-mutex ^0.5.0` npm packages
- [x] Create `src/lib/udp_queue_manager.js` with queue management
- [x] Update `src/lib/assert/config-file-schema.js` with queue config
- [x] Update `src/globals.js` with `udpQueueManager = null`
- [x] Update `src/config/production_template.yaml` with queue config
- [x] Update `src/udp/udp_handlers.js` to use `UdpQueueManager`
- [x] Add unit tests for `udp_queue_manager.js` (7 tests)
- [x] All 20 UDP handler tests pass
- [x] Run `npm run lint:fix` - code quality verified

### Remaining/Optional
- [ ] Add queue metrics to InfluxDB (optional, disabled by default)
- [x] Add message authentication (HMAC) - REMOVED (not needed)
- [x] Create completed work documentation in `docs/completed_work/udp-queue-management.md`

## Test Results
```
Test Suites: 2 passed, 2 total
Tests:       27 passed, 27 total
  - 20 tests: src/udp/__tests__/udp_handlers.test.js
  - 7 tests: src/lib/__tests__/udp_queue_manager.test.js
```

## Config Changes
New config options in `Butler.udpServerConfig`:
- `messageQueue.maxConcurrent` - Max concurrent processing (default: 10)
- `messageQueue.maxSize` - Max queue size (default: 200)
- `messageQueue.backpressureThreshold` - Backpressure threshold in percent (default: 80)
- `rateLimit.enable` - Enable/disable rate limiting (default: false)
- `rateLimit.maxMessagesPerMinute` - Max messages per minute (default: 600)
- `maxMessageSize` - Max UDP payload size in bytes (default: 65507)
- `enableSourceValidation` - Enable source IP allowlist validation (default: false)
- `allowedSources` - Allowed IPv4 addresses/hostnames for source validation (default: empty list)
- `queueMetrics.influxdb.enable` - Enable queue metric writes to InfluxDB (default: false)
- `queueMetrics.influxdb.writeFrequency` - Queue metric write interval in ms (default: 20000)
- `queueMetrics.influxdb.measurementName` - InfluxDB measurement for queue metrics (default: `butler_udp_queue`)

## Files Modified/Created
### New Files
- `src/lib/udp_queue_manager.js` - Queue manager with CircularBuffer, RateLimiter, UdpQueueManager
- `src/lib/udp_ip_validator.js` - IP/hostname validation utility
- `src/lib/udp_sanitizer.js` - Input sanitization
- `src/lib/__tests__/udp_queue_manager.test.js` - Queue manager tests

### Modified Files
- `src/butler.js` - Changed reuseAddr to false, added queue initialization
- `src/udp/udp_handlers.js` - Integrated queue manager, added validations
- `src/lib/guid_util.js` - Exported `guidRegex`
- `src/lib/assert/config-file-schema.js` - Added queue config schema
- `src/globals.js` - Added udpQueueManager, udpMaxMessageSize, etc.
- `src/config/production_template.yaml` - Documented new config options

## References
- Butler SOS implementation: `butler-sos/src/lib/udp-queue-manager.js`
- p-queue: https://github.com/sindresorhus/p-queue
- async-mutex: https://github.com/nicolo-ribaudo/async-mutex
