# Enhanced QRS API Error Messages

## What Changed

Butler now provides detailed context in error messages when QRS (Qlik Sense Repository Service) API calls fail. Error messages include the endpoint, host, port, error code, and other relevant debugging information to help operators quickly identify and troubleshoot issues.

## Before and After

### Before

Error messages lacked critical debugging context:

```
[QSEOW] QLIKSENSE LICENSE MONITOR: AxiosError: timeout of 30000ms exceeded
```

```
[QSEOW] QLIKSENSE LICENSE MONITOR: Error: read ECONNRESET
```

### After

Error messages now include comprehensive context:

```
[QSEOW] QLIKSENSE LICENSE MONITOR: Request failed - endpoint: license/accesstypeoverview, host: qs-server.example.com, port: 4242, code: ECONNABORTED, message: timeout of 30000ms exceeded, method: GET, timeout: 30000ms, baseURL: https://qs-server.example.com:4242/qrs/
```

```
[QSEOW] QLIKSENSE LICENSE MONITOR: Request failed - endpoint: license/accesstypeoverview, host: qs-server.example.com, port: 4242, code: ECONNRESET, message: read ECONNRESET, errno: -104, syscall: read, method: GET, baseURL: https://qs-server.example.com:4242/qrs/
```

## Affected Operations

This enhancement applies to all Qlik Sense license monitoring and management operations:

- **Server license monitoring**: Checks Qlik Sense server license status and expiration
- **Access license monitoring**: Monitors access license usage (professional and analyzer)
- **License release**: Releases unused professional and analyzer licenses

## Error Types Handled

The enhanced error messages work with all error types, including but not limited to:

| Error Type | Example Code | What You'll See |
|------------|-------------|-----------------|
| **Timeout** | `ECONNABORTED` | endpoint, host, port, code, timeout, message |
| **Connection reset** | `ECONNRESET` | endpoint, host, port, code, errno, syscall |
| **Connection refused** | `ECONNREFUSED` | endpoint, host, port, code, errno, syscall, address |
| **DNS errors** | `ENOTFOUND` | endpoint, host, port, code, hostname |
| **SSL/TLS errors** | Various | endpoint, host, port, code, message |
| **HTTP errors** | N/A | endpoint, host, port, status, statusText |
| **Network errors** | Various | endpoint, host, port, code, message |

## Error Context Fields

The error formatter extracts and displays the following information when available:

### Request Context
- `endpoint`: The QRS API endpoint that was called (e.g., `license/accesstypeoverview`)
- `host`: The Qlik Sense server hostname or IP address
- `port`: The QRS port number (typically 4242)

### Error Properties
- `code`: Error code (e.g., `ECONNABORTED`, `ECONNRESET`, `ECONNREFUSED`)
- `message`: Error message from the underlying library

### Axios-Specific Properties
- `method`: HTTP method (GET, POST, PUT, DELETE)
- `timeout`: Request timeout in milliseconds
- `baseURL`: Base URL of the QRS API
- `url`: Full URL of the request

### Response Context (if server responded)
- `status`: HTTP status code (e.g., 500, 404)
- `statusText`: HTTP status text (e.g., "Internal Server Error")

### Network Error Properties
- `errno`: System error number
- `syscall`: System call that failed (e.g., `read`, `connect`)
- `hostname`: Hostname from DNS resolution
- `address`: IP address that was being connected to

### Future-Proof Design
The error formatter automatically includes any additional error properties that may be present, ensuring compatibility with new error types and libraries.

## Troubleshooting Guide

When you see these enhanced error messages, here's what to check:

### Timeout Errors (ECONNABORTED)

**Symptoms:**
```
code: ECONNABORTED, message: timeout of 30000ms exceeded
```

**Possible Causes:**
- Qlik Sense server is under heavy load
- Network latency between Butler and Qlik Sense
- QRS service is slow to respond

**Actions:**
- Check Qlik Sense server performance and resource usage
- Verify network connectivity and latency
- Consider increasing timeout in configuration if needed

### Connection Reset (ECONNRESET)

**Symptoms:**
```
code: ECONNRESET, errno: -104, syscall: read
```

**Possible Causes:**
- Qlik Sense server restarted during the request
- Network interruption or firewall terminating connections
- Proxy or load balancer closing idle connections

**Actions:**
- Check Qlik Sense server logs for restarts or crashes
- Verify network stability
- Check firewall and proxy configurations

### Connection Refused (ECONNREFUSED)

**Symptoms:**
```
code: ECONNREFUSED, errno: -61, syscall: connect, address: 127.0.0.1
```

**Possible Causes:**
- Qlik Sense Repository Service is not running
- Incorrect host or port in configuration
- Firewall blocking the connection

**Actions:**
- Verify Qlik Sense Repository Service is running
- Check `Butler.configQRS.host` and `Butler.configQRS.port` in configuration
- Verify firewall rules allow connections to the QRS port

### DNS Errors (ENOTFOUND)

**Symptoms:**
```
code: ENOTFOUND, hostname: qs-server.example.com
```

**Possible Causes:**
- Hostname misspelled in configuration
- DNS resolution issues
- DNS server unavailable

**Actions:**
- Verify hostname spelling in `Butler.configQRS.host`
- Test DNS resolution: `nslookup qs-server.example.com`
- Use IP address instead of hostname as a workaround

### HTTP Errors (4xx, 5xx)

**Symptoms:**
```
status: 500, statusText: Internal Server Error
```

**Possible Causes:**
- QRS API returned an error
- Authentication or authorization issues
- Invalid request parameters

**Actions:**
- Check Qlik Sense server logs for detailed error information
- Verify QRS certificates are valid and not expired
- Check Butler logs for the full request details

## Configuration

No configuration changes are required. The enhanced error messages are automatic and transparent.

## Benefits

1. **Faster troubleshooting**: Immediately see which endpoint and host failed
2. **Better debugging**: Error codes and properties help identify root cause
3. **Future-proof**: Works with any error type, including new ones
4. **No action needed**: Enhancement is transparent to operators
5. **Comprehensive**: Captures all available context from the error object

## Technical Details

### Implementation

The error formatting is handled by a helper function `formatQrsErrorWithContext()` that:

1. Extracts request context (endpoint, host, port)
2. Extracts error properties (code, message)
3. Extracts Axios-specific properties (method, timeout, baseURL)
4. Extracts response context (status, statusText)
5. Extracts network error properties (errno, syscall, hostname, address)
6. Includes any additional enumerable properties for future compatibility

### Design Principles

- **Generic**: Works with any error type, not just known ones
- **Future-proof**: Automatically includes new error properties
- **Comprehensive**: Captures all available context
- **Maintainable**: Single helper function, easy to update
- **Debuggable**: Provides maximum context for troubleshooting

## Migration Notes

This change is backward compatible. Existing log parsing and monitoring tools should continue to work, though they may need updates to take advantage of the additional context.

### Log Pattern Changes

**Old pattern:**
```
[QSEOW] QLIKSENSE LICENSE MONITOR: <error message>
```

**New pattern:**
```
[QSEOW] QLIKSENSE LICENSE MONITOR: Request failed - <context details>
```

The prefix `[QSEOW] QLIKSENSE LICENSE MONITOR:` remains the same for compatibility with existing log filters.
