/**
 * Constants for timeouts, delays, and other configuration values throughout Butler.
 * Centralizing these values makes them easier to maintain and document.
 */

// HTTP/API Timeouts (in milliseconds)
export const HTTP_TIMEOUT_MS = 30000; // 30 seconds - Used for QRS, QS Cloud API, and MQTT connections
export const HTTP_TIMEOUT_SHORT_MS = 10000; // 10 seconds - Used for monitoring endpoints and webhooks
export const HTTP_TIMEOUT_VERY_SHORT_MS = 5000; // 5 seconds - Used for New Relic API calls
export const DOCKER_HEALTHCHECK_TIMEOUT_MS = 2000; // 2 seconds - Docker healthcheck timeout

// Retry Configuration
export const MAX_RETRY_ATTEMPTS = 3; // Maximum number of retry attempts for script log retrieval
export const RETRY_DELAY_MS = 2000; // 2 seconds - Delay between retry attempts
export const DOWNLOAD_DELAY_MS = 500; // 500ms - Delay before downloading script log

// Telemetry Configuration (PostHog)
export const TELEMETRY_FLUSH_INTERVAL_MS = 60 * 1000; // 60 seconds - How often to flush telemetry events
export const TELEMETRY_REQUEST_TIMEOUT_MS = 30 * 1000; // 30 seconds - Timeout for telemetry requests

// Application Initialization
export const GLOBALS_INIT_TIMEOUT_MS = 5000; // 5 seconds - Time to wait for globals initialization
export const GLOBALS_INIT_CHECK_INTERVAL_MS = 1000; // 1 second - Interval between initialization checks

// Text/Message Limits
export const SLACK_TEXT_FIELD_MAX_LENGTH = 3000; // Maximum length for Slack API text fields
export const MSTEAMS_TEXT_FIELD_MAX_LENGTH = 3000; // Maximum length for MS Teams text fields

// Distribution Queue Configuration
export const DISTRIBUTION_QUEUE_POLL_INTERVAL_MS = 30000; // 30 seconds - How often to check queued distribution tasks
export const DISTRIBUTION_QUEUE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours - Maximum time a task can remain in queue

// Buffer sizes and other limits
// Currently no specific buffer size constants needed, but this section is here for future use
// export const FILE_BUFFER_SIZE = 64 * 1024; // 64KB - File buffer size (if needed in the future)
