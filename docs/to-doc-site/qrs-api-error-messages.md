# Enhanced QRS API Error Messages

## What Changed

Butler now uses a shared structured error-handling pattern for QRS (Qlik Sense Repository Service) API calls.

This is a broader change than the first version of this enhancement. It now affects not only license monitoring, but also many other Butler features that call QRS.

The new behavior does two things:

1. It adds much more context to QRS-related error messages.
2. It validates QRS responses before Butler tries to use returned data.

That means operators now get clearer troubleshooting information, and Butler is less likely to produce confusing follow-on errors when QRS returns an unexpected response.

## Why It Matters

Previously, Butler often logged only a short Axios or JavaScript error message when a QRS call failed. In some cases Butler reached QRS successfully, but QRS returned a non-200 response or an unexpected payload shape. That could lead to a second, less helpful error later in the same operation.

With the new implementation, Butler logs the original failure with more context and stops the affected operation more cleanly.

## Two Types of Failures You Will Now See

### 1. Request failed

This means Butler could not complete the request at all, or Axios threw an error while making the request.

Examples include:

- timeouts
- TLS or certificate problems
- DNS errors
- refused connections
- reset connections
- network interruptions

Example:

```
[QSEOW] QLIKSENSE LICENSE MONITOR: Request failed - endpoint: license/accesstypeoverview, host: qs-server.example.com, port: 4242, code: ECONNABORTED, message: timeout of 30000ms exceeded, method: GET, timeout: 30000ms, baseURL: https://qs-server.example.com:4242/qrs/
```

### 2. Unexpected QRS response

This means Butler did reach QRS, but the response was not what the operation expected.

Examples include:

- non-200 HTTP responses from QRS
- non-204 responses where Butler expected `204 No Content`
- missing or malformed response bodies
- missing fields in the QRS payload

Example:

```
[QSEOW] GET SCRIPT LOG (DEPRECATED API): Unexpected reference response - endpoint: reloadtask/12345678-1234-1234-1234-123456789abc/scriptlog?fileReferenceId=abcdef12-3456-7890-abcd-ef1234567890, host: qs-server.example.com, port: 4242, method: GET, expectedStatus: 200, status: 500, body.message: Internal Server Error
```

Another example:

```
STARTTASK: Error while starting Sense task: endpoint: task/12345678-1234-1234-1234-123456789abc/start, host: qs-server.example.com, port: 4242, method: POST, expectedStatus: 204, status: 409, body.message: Conflict
```

## Where This Applies

This enhancement now applies to a much broader set of Butler features that use QRS.

### License-related QRS operations

- server license monitoring
- access license monitoring
- license release for professional licenses
- license release for analyzer licenses

### Task execution lookups

- reload task execution results
- preload task execution results
- distribute task execution results
- external program task execution results
- user sync task execution results

### Script log retrieval

- reload task script log retrieval using the older QRS script log endpoint
- reload task script log retrieval using the newer QRS script log endpoint
- fallback between the two methods when needed

### Metadata and lookup helpers

- task existence checks
- task listing
- task start requests
- app metadata lookups
- task metadata lookups
- app tag lookups
- task tag lookups
- app owner lookups
- reload task custom property lookups
- available reload-task custom property definition lookups

### Configuration and routing helpers

- QRS-backed New Relic configuration validation
- QRS lookups used when mapping reload task custom properties to New Relic destinations

## What Butler Now Logs

When available, Butler now logs the following kinds of context.

### Request context

- `endpoint`: The QRS endpoint that Butler called
- `host`: The Qlik Sense server hostname or IP address
- `port`: The QRS port number, usually `4242`
- `method`: HTTP method such as `GET`, `POST`, or `DELETE`
- `expectedStatus`: Expected HTTP status code(s) for that operation

### Transport and Axios context

- `code`: Error code such as `ECONNABORTED`, `ECONNRESET`, or `ECONNREFUSED`
- `message`: Error message returned by Axios or Node.js
- `timeout`: Request timeout in milliseconds
- `baseURL`: Base QRS URL
- `url`: Request URL if Axios provides it separately

### Response context

- `status`: HTTP status code returned by QRS
- `statusText`: HTTP status text when available
- short body summaries such as:
	- `body.message`
	- `body.error`
	- `body.details`
	- `body.code`
	- `bodyLength` for arrays

### Network details

- `errno`
- `syscall`
- `hostname`
- `address`

## Sensitive Data Handling

The new formatter avoids logging common sensitive fields.

Examples of redacted field types:

- authorization headers
- tokens
- passwords
- cookies
- secrets
- API keys
- private keys

This means the logs are more useful without exposing the most common credential values.

## Operational Impact

No configuration changes are required.

This is a backward-compatible operational improvement. Butler behavior should remain the same from an alerting and workflow point of view, with two important improvements:

1. Logs are more useful when QRS requests fail.
2. Some helper functions now fail more gracefully when QRS returns invalid or unexpected responses.

## Troubleshooting Guide

### If you see `Request failed - ...`

Start by checking connectivity between Butler and Qlik Sense.

Typical causes:

- QRS service is down or restarting
- incorrect `Butler.configQRS.host` or `Butler.configQRS.port`
- firewall or proxy interference
- certificate or TLS trust issues
- DNS problems
- temporary overload on the Qlik Sense server

### If you see `Unexpected QRS response - ...`

Start by assuming Butler did reach QRS, but QRS rejected the request or returned something Butler could not use.

Typical causes:

- wrong or stale object ID
- QRS-side internal error
- permission or certificate identity problem
- endpoint behavior changed between Qlik Sense versions
- Butler expected a list or object that QRS did not return

### Common patterns

#### Timeout

Example:

```
code: ECONNABORTED, message: timeout of 30000ms exceeded
```

What to check:

- Qlik Sense server load
- latency between Butler and Qlik Sense
- whether the timeout is too short for the operation

#### Connection refused

Example:

```
code: ECONNREFUSED, errno: -61, syscall: connect
```

What to check:

- QRS service availability
- host and port settings
- firewall rules

#### DNS resolution failure

Example:

```
code: ENOTFOUND, hostname: qs-server.example.com
```

What to check:

- spelling of `Butler.configQRS.host`
- DNS resolution from the Butler host
- whether an IP address should be used temporarily for testing

#### HTTP error from QRS

Example:

```
expectedStatus: 200, status: 500, body.message: Internal Server Error
```

What to check:

- Qlik Sense Repository Service logs
- object IDs used in the request
- certificate validity and trust
- changes in endpoint behavior after an upgrade

## Related Non-QRS Change

The same structured HTTP error pattern is now also used by the Qlik Sense version monitor.

That monitor calls `/v1/systeminfo` on port `9032`, which is not a QRS endpoint. Even so, operators will now see a similar structured error format there too.

This means Butler now has:

- structured QRS error messages for QRS-based operations
- a matching structured HTTP pattern for the version monitor

## Benefits

1. Faster troubleshooting because the failing endpoint is visible immediately.
2. Better distinction between network failures and QRS response failures.
3. Fewer misleading follow-on errors when QRS returns an unexpected payload.
4. Better safety through redaction of common sensitive fields.
5. Consistent error-message structure across a large part of Butler's QSEoW integration.

## Compatibility Notes

This change is compatible with existing Butler configuration.

If you have external log parsers, alerts, or dashboards that depend on exact log text after the prefix, they may need updates. The log prefixes are mostly unchanged, but the message body is now richer and may contain:

- `Request failed - ...`
- `Unexpected QRS response - ...`
- `expectedStatus: ...`
- structured response body summaries
