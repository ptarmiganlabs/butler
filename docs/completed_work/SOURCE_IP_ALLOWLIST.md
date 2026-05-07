# UDP Source IP Allowlisting

## Overview

Butler's UDP server can now optionally validate the source IP address of incoming UDP messages. When enabled, only messages from IP addresses or hostnames in the allowed list will be processed.

## Configuration

Add to your Butler config file:

```yaml
Butler:
  udpServerConfig:
    enable: true
    serverHost: "0.0.0.0"
    portTaskFailure: 9998
    enableSourceValidation: true
    allowedSources:
      - "192.168.1.100"   # IPv4 address
      - "sense-server-01" # Hostname (resolved at startup)
      - "10.0.0.0"        # Another IPv4 address
```

## How It Works

1. At startup, Butler parses `allowedSources` and resolves any hostnames to IPv4 addresses
2. When a UDP message arrives, the `remote.address` is checked against the allowed IPs list
3. Messages from unauthorized sources are rejected with a warning log
4. Invalid hostnames/IPs in config are reported as errors, validation is disabled

## Supported Formats

- **IPv4 addresses**: Exact match (e.g., `192.168.1.100`)
- **Hostnames**: Resolved to IPv4 at startup (e.g., `sense-server-01`)

## Security Benefit

- Prevents unauthorized hosts from sending UDP messages to Butler
- Critical mitigation since UDP lacks built-in authentication
- Should be used with firewall rules for defense in depth

## Notes

- `enableSourceValidation: false` by default (backward compatible)
- If `allowedSources` is empty and validation is enabled, all sources are allowed
- Hostnames are resolved once at startup (not on each message)
- IPv6 addresses are not supported (use IPv4 or hostnames that resolve to IPv4)
