/**
 * Crash dump module for Butler.
 *
 * Writes a crash dump file (JSON and/or plain text) when Butler encounters
 * an unrecoverable error such as an uncaught exception, unhandled promise
 * rejection, or an explicit fatal error logged via logFatal().
 *
 * Key design goals:
 * - Sensitive config data (IPs, passwords, tokens, certificates) is never written
 * - Best-effort redaction of common sensitive patterns in error messages/stacks
 * - Times out after CRASH_DUMP_WRITE_TIMEOUT_MS so it can never block process exit
 * - File write failures are silently swallowed so they cannot prevent process.exit()
 * - SEA-compatible: works correctly in packaged Single Executable Applications
 * - Machine-readable (JSON) and human-readable (TXT) output
 *
 * NOTE: Error messages and stack traces are included for debugging purposes.
 * While best-effort redaction is applied, error content may still contain
 * sensitive data depending on what the upstream error captured.
 */

import fs from 'fs';
import path from 'path';
import sea from 'node:sea';

import globals from '../globals.js';

// ---------------------------------------------------------------------------
// Module-level constants and state
// ---------------------------------------------------------------------------

/**
 * Maximum time (ms) to wait for crash dump files to be written.
 * If writes take longer than this, writeCrashDump() resolves anyway so that
 * the calling code can proceed to process.exit() without being blocked.
 */
const CRASH_DUMP_WRITE_TIMEOUT_MS = 5000;

/**
 * Per-process counter to ensure filename uniqueness when multiple crashes occur
 * within the same millisecond (e.g. multiple fatal handlers firing simultaneously).
 */
let crashDumpCounter = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a timestamp string suitable for use in crash dump filenames.
 * Format: YYYYMMDD_HHMMSS_mmm (local time)
 *
 * @returns {string} Timestamp string in YYYYMMDD_HHMMSS_mmm format
 */
function buildTimestampForFilename() {
    const now = new Date();
    const YYYY = String(now.getFullYear()).padStart(4, '0');
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const HH = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const SS = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `${YYYY}${MM}${DD}_${HH}${mm}${SS}_${ms}`;
}

/**
 * Sanitizes a stack trace by removing absolute path prefixes.
 * Handles both POSIX and Windows path separators.
 * Frames containing "src/" keep only the relative portion; other
 * standalone absolute path tokens are replaced with "[path]".
 *
 * @param {string|undefined} stack - The raw stack trace string
 * @returns {string} Sanitized stack trace
 */
function sanitizeStackTrace(stack) {
    if (!stack) return '';

    // 1. Strip absolute prefixes from frames that include "src/" (handles both POSIX and Windows)
    let result = stack.replace(/[^\s\n(]*[/\\]src[/\\]/g, 'src/');

    // 2. Redact remaining standalone absolute POSIX paths (start with /).
    //    Use lookbehind to match only paths that follow whitespace or '(' so we
    //    don't accidentally match within already-reduced 'src/...' paths.
    result = result.replace(/(?<=[\s(])\/[^\s\n()]+/g, '[path]');

    // 3. Redact remaining absolute Windows paths (e.g. C:\...)
    result = result.replace(/[A-Za-z]:\\[^\s\n()]+/g, '[path]');

    return result;
}

/**
 * Applies best-effort redaction of common sensitive patterns from a string.
 * This covers URLs with embedded credentials, bearer tokens, and common
 * key=value secret patterns found in error messages.
 *
 * This is best-effort only: it cannot guarantee that all sensitive data is
 * removed, especially when errors embed unusual secret formats.
 *
 * @param {string|undefined} text - The text to redact
 * @returns {string} Text with common sensitive patterns replaced
 */
function redactSensitivePatterns(text) {
    if (!text) return '';

    let result = text;

    // 1. URLs with embedded credentials: protocol://user:pass@host
    result = result.replace(/([\w+.-]+:\/\/)[^@\s]+@/g, '$1[REDACTED]@');

    // 2. Bearer / Basic / Token authorization headers
    result = result.replace(/\b(Bearer|Basic|Token)\s+[A-Za-z0-9+/=._-]{8,}/gi, '$1 [REDACTED]');

    // 3. Common key=value secret patterns (query strings, connection strings, etc.)
    result = result.replace(
        /\b(password|passwd|pwd|secret|token|api[_-]?key|api[_-]?token|access[_-]?key|auth|passphrase|client[_-]?secret)\s*[=:]\s*[^\s&,;"'[\]{}()]+/gi,
        '$1=[REDACTED]',
    );

    // 4. JSON-style quoted key/value pairs for the same patterns
    result = result.replace(
        /["'](password|passwd|pwd|secret|token|api[_-]?key|api[_-]?token|access[_-]?key|auth|passphrase|client[_-]?secret)["']\s*:\s*["'][^"']+["']/gi,
        '"$1": "[REDACTED]"',
    );

    return result;
}

/**
 * Builds a sanitized subset of the application configuration for inclusion in
 * crash dump files. Only non-sensitive fields are included.
 *
 * @returns {object} Object containing safe, non-sensitive config values
 */
function buildSafeConfig() {
    const safeConfig = {};

    try {
        const cfg = globals.config;
        if (!cfg) return safeConfig;

        /**
         * Safely reads a config value, returning undefined on failure.
         *
         * @param {string} key - The config key to read
         * @returns {unknown} The config value or undefined if the key is not found
         */
        const safeGet = (key) => {
            try {
                return cfg.has(key) ? cfg.get(key) : undefined;
            } catch {
                return undefined;
            }
        };

        // Non-sensitive operational settings
        const logLevel = safeGet('Butler.logLevel');
        if (logLevel !== undefined) safeConfig.logLevel = logLevel;

        const fileLogging = safeGet('Butler.fileLogging');
        if (fileLogging !== undefined) safeConfig.fileLogging = fileLogging;

        const logDirectory = safeGet('Butler.logDirectory');
        if (logDirectory !== undefined) safeConfig.logDirectory = logDirectory;

        const anonTelemetry = safeGet('Butler.anonTelemetry');
        if (anonTelemetry !== undefined) safeConfig.anonTelemetry = anonTelemetry;

        const systemInfoEnable = safeGet('Butler.systemInfo.enable');
        if (systemInfoEnable !== undefined) safeConfig.systemInfoEnable = systemInfoEnable;

        const restServerEnable = safeGet('Butler.restServerConfig.enable');
        if (restServerEnable !== undefined) safeConfig.restServerEnable = restServerEnable;

        const udpServerEnable = safeGet('Butler.udpServerConfig.enable');
        if (udpServerEnable !== undefined) safeConfig.udpServerEnable = udpServerEnable;

        const mqttEnable = safeGet('Butler.mqttConfig.enable');
        if (mqttEnable !== undefined) safeConfig.mqttEnable = mqttEnable;

        const influxDbEnable = safeGet('Butler.influxDb.enable');
        if (influxDbEnable !== undefined) safeConfig.influxDbEnable = influxDbEnable;
    } catch {
        // Config access failed entirely – return whatever we have so far
    }

    return safeConfig;
}

/**
 * Resolves the directory to write crash dump files into.
 * Falls back to `process.cwd()` when the configured directory is empty.
 *
 * @param {string} configuredDir - The directory path from config (may be relative or absolute)
 * @returns {string} Absolute path to the crash dump directory
 */
function resolveCrashDir(configuredDir) {
    if (!configuredDir || configuredDir.trim() === '') {
        return process.cwd();
    }
    return path.isAbsolute(configuredDir) ? configuredDir : path.resolve(process.cwd(), configuredDir);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Writes crash dump files (JSON and/or plain text) for a fatal error.
 *
 * The function times out after {@link CRASH_DUMP_WRITE_TIMEOUT_MS} milliseconds so it
 * can never block process exit indefinitely on slow or hung storage. It also
 * swallows all its own errors so I/O failures can never prevent process.exit().
 *
 * Sensitive config data is excluded entirely. Error messages and stack traces
 * are included for debugging, with best-effort redaction of common secret
 * patterns (URLs with credentials, bearer tokens, key=value secrets).
 * Redaction cannot guarantee removal of all sensitive data from error content;
 * treat crash dump files as potentially sensitive.
 *
 * @param {Error|unknown} error - The error object (or any value) that caused the crash
 * @param {string} source - Where the crash originated:
 *   "uncaughtException" | "unhandledRejection" | "logFatal"
 *
 * @returns {Promise<void>} Resolves when writing is complete or the timeout fires
 */
export async function writeCrashDump(error, source) {
    try {
        // ----------------------------------------------------------------
        // Read crash-dump config. Default to enabled / ./crash_dumps if
        // globals are not yet available (very early crashes).
        // ----------------------------------------------------------------
        let enable = true;
        let crashDir = './crash_dumps';
        let createJson = true;
        let createText = true;

        try {
            const cfg = globals.config;
            if (cfg) {
                if (cfg.has('Butler.crashFile.enable')) {
                    enable = cfg.get('Butler.crashFile.enable');
                }
                if (cfg.has('Butler.crashFile.crashFileDirectory')) {
                    crashDir = cfg.get('Butler.crashFile.crashFileDirectory');
                }
                if (cfg.has('Butler.crashFile.crashFileCreateJson')) {
                    createJson = cfg.get('Butler.crashFile.crashFileCreateJson');
                }
                if (cfg.has('Butler.crashFile.crashFileCreateText')) {
                    createText = cfg.get('Butler.crashFile.crashFileCreateText');
                }
            }
        } catch {
            // Config not yet initialised – use defaults above
        }

        if (!enable) return;
        if (!createJson && !createText) return;

        // ----------------------------------------------------------------
        // Build the crash dump payload
        // ----------------------------------------------------------------
        const timestamp = new Date().toISOString();
        const appName = 'butler';
        const appVersion = globals.appVersion ?? 'unknown';
        const nodeVersion = process.version.replace(/^v/, '');
        const platform = `${process.platform}/${process.arch}`;
        const isSea = globals.isSea !== undefined ? globals.isSea : sea.isSea();

        const errorType = error?.constructor?.name ?? 'Error';
        const errorMessage = redactSensitivePatterns(error?.message ?? String(error));
        const errorStack = redactSensitivePatterns(sanitizeStackTrace(error?.stack));

        const crashData = {
            version: '1.0',
            timestamp,
            app: {
                name: appName,
                version: appVersion,
            },
            runtime: {
                nodeVersion,
                platform,
                isSea,
            },
            error: {
                type: errorType,
                message: errorMessage,
                stack: errorStack,
            },
            context: {
                exitCode: 1,
                source: source ?? 'unknown',
            },
            config: buildSafeConfig(),
        };

        // ----------------------------------------------------------------
        // Determine output paths
        // ----------------------------------------------------------------
        const resolvedDir = resolveCrashDir(crashDir);
        const ts = buildTimestampForFilename();
        // Include PID and an incrementing counter to guarantee uniqueness even
        // when two fatal handlers fire within the same millisecond.
        const uniqueSuffix = `${process.pid}_${++crashDumpCounter}`;
        const jsonFilePath = path.join(resolvedDir, `crash_dump_${ts}_${uniqueSuffix}.json`);
        const txtFilePath = path.join(resolvedDir, `crash_dump_${ts}_${uniqueSuffix}.txt`);

        // Create directory (synchronous is fine here since we are about to exit
        // anyway; mode 0o700 keeps the directory owner-only accessible).
        try {
            fs.mkdirSync(resolvedDir, { recursive: true, mode: 0o700 });
        } catch {
            // Directory creation failed – attempt to write anyway in case it
            // already exists
        }

        // ----------------------------------------------------------------
        // Build plain-text report
        // ----------------------------------------------------------------
        const executableType = isSea ? 'SEA (packaged)' : 'Node.js';
        const textReport = [
            '====================================',
            'BUTLER CRASH REPORT',
            '====================================',
            `Generated: ${timestamp}`,
            '',
            '=== APPLICATION INFO ===',
            `Butler Version: ${appVersion}`,
            `Node.js Version: ${nodeVersion}`,
            `Platform: ${platform}`,
            `Executable: ${executableType}`,
            '',
            '=== CRASH INFO ===',
            `Error Type: ${errorType}`,
            `Source: ${source ?? 'unknown'}`,
            `Exit Code: 1`,
            '',
            '=== ERROR MESSAGE ===',
            errorMessage,
            '',
            '=== STACK TRACE ===',
            errorStack || '(no stack trace available)',
            '',
            '====================================',
            'END OF CRASH REPORT',
            '====================================',
        ].join('\n');

        // ----------------------------------------------------------------
        // Write files
        // Track per-file success so the log message is only emitted when
        // the file was actually written (write errors and timeout are both
        // treated as non-success).
        // ----------------------------------------------------------------
        let jsonWritten = false;
        let txtWritten = false;

        const writePromises = [];

        if (createJson) {
            writePromises.push(
                fs.promises
                    .writeFile(jsonFilePath, JSON.stringify(crashData, null, 2), {
                        encoding: 'utf8',
                        mode: 0o600,
                        flag: 'wx',
                    })
                    .then(() => {
                        jsonWritten = true;
                    })
                    .catch(() => {}),
            );
        }

        if (createText) {
            writePromises.push(
                fs.promises
                    .writeFile(txtFilePath, textReport, {
                        encoding: 'utf8',
                        mode: 0o600,
                        flag: 'wx',
                    })
                    .then(() => {
                        txtWritten = true;
                    })
                    .catch(() => {}),
            );
        }

        // Race the writes against a timeout so crash dump writes can never
        // block process exit indefinitely (e.g. on slow or hung storage).
        const writeTimeout = new Promise((resolve) => {
            const timer = setTimeout(resolve, CRASH_DUMP_WRITE_TIMEOUT_MS);
            // Allow the event loop to exit naturally even if the timer is
            // still pending (belt-and-suspenders in addition to the caller's
            // process.exit()).
            if (typeof timer.unref === 'function') timer.unref();
        });

        await Promise.race([Promise.all(writePromises), writeTimeout]);

        // Log the actual path only when the file was confirmed written.
        // Silently skip if the write failed, timed out, or was prevented
        // by an exclusive-create (wx) conflict.
        if (jsonWritten) {
            try {
                if (globals.logger) {
                    globals.logger.error(`CRASH DUMP: Written to ${jsonFilePath}`);
                } else {
                    console.error(`CRASH DUMP: Written to ${jsonFilePath}`);
                }
            } catch {
                console.error(`CRASH DUMP: Written to ${jsonFilePath}`);
            }
        }
        if (txtWritten) {
            try {
                if (globals.logger) {
                    globals.logger.error(`CRASH DUMP: Written to ${txtFilePath}`);
                } else {
                    console.error(`CRASH DUMP: Written to ${txtFilePath}`);
                }
            } catch {
                console.error(`CRASH DUMP: Written to ${txtFilePath}`);
            }
        }
    } catch {
        // writeCrashDump must never throw
    }
}
