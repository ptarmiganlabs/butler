# System Information Security Configuration

## Overview

Butler collects system information for monitoring and diagnostic purposes. This information helps with troubleshooting, resource monitoring, and identifying system characteristics. However, on Windows systems, this may trigger security alerts in enterprise environments due to OS command execution.

## Root Cause

Butler uses the [systeminformation](https://www.npmjs.com/package/systeminformation) npm package to gather detailed system information. On Windows, this package internally executes several OS commands to collect system details:

- `cmd.exe /d /s /c \chcp` - Gets code page information
- `netstat -r` - Gets routing table information  
- `cmd.exe /d /s /c \echo %COMPUTERNAME%.%USERDNSDOMAIN%` - Gets computer name and domain

These commands are **not executed directly by Butler** but by the systeminformation package dependency. The commands are legitimate system information gathering commands, but they may trigger alerts in security monitoring tools.

## Security Configuration

Starting with this version, Butler provides a configuration option to disable detailed system information gathering for security-sensitive environments.

### Configuration Option

Add this section to your Butler configuration file:

```yaml
Butler:
  # System information gathering
  # Butler collects system information for monitoring and diagnostic purposes.
  # On Windows, this may trigger security alerts in enterprise monitoring tools as it executes various OS commands:
  # - cmd.exe /d /s /c \chcp (to get code page info)
  # - netstat -r (to get routing table)  
  # - cmd.exe /d /s /c \echo %COMPUTERNAME%.%USERDNSDOMAIN% (to get computer/domain names)
  # These commands are executed by the 'systeminformation' npm package, not directly by Butler.
  systemInfo:
    enable: true    # Set to false in security-sensitive environments
```

### When to Disable System Information

Consider setting `systemInfo.enable: false` if:

- Your security monitoring tools flag the OS command execution as suspicious
- Your organization has strict policies against any automated OS command execution
- You don't need detailed system information in logs and monitoring outputs
- Butler runs in a highly secured environment

### Impact of Disabling System Information

When `systemInfo.enable` is set to `false`:

**✅ Benefits:**
- No OS commands are executed by the systeminformation package
- Eliminates security alerts from monitoring tools
- Butler continues to function normally
- Basic system information is still collected using Node.js built-in APIs

**⚠️ Limitations:**
- Reduced detail in system information logs
- Some monitoring dashboards may show less detailed host information
- Telemetry data will contain minimal system details

**What's Still Collected:**
- Node.js version and platform information
- Basic OS platform, architecture, and version
- Memory and CPU count from Node.js APIs
- Application version and instance ID

**What's Not Collected:**
- Detailed CPU model and specifications
- Detailed OS distribution information
- Network interface details
- Docker information
- Detailed memory specifications

## Example Configuration Files

### High Security Environment
```yaml
Butler:
  systemInfo:
    enable: false  # Disable to prevent OS command execution
  # ... rest of configuration
```

### Standard Environment
```yaml
Butler:
  systemInfo:
    enable: true   # Default - enables full system information gathering
  # ... rest of configuration
```

## Testing the Configuration

To test that the configuration is working correctly:

1. Set `systemInfo.enable: false` in your config
2. Start Butler
3. Check the logs for: `"SYSTEM INFO: Detailed system information gathering is disabled. Using minimal system info."`
4. Verify that your security monitoring tools no longer flag the OS command execution

## Troubleshooting

### Configuration Validation Errors

If you see configuration validation errors related to `systemInfo`:

1. Ensure the `systemInfo` section is properly nested under `Butler`
2. Verify that `enable` is set to a boolean value (`true` or `false`), not a string
3. Check YAML indentation is correct

### Missing System Information

If you need some system information but want to minimize OS command execution:

1. Consider using `systemInfo.enable: true` but monitor which specific commands trigger alerts
2. Work with your security team to whitelist the specific systeminformation package commands
3. Use Butler logging to capture the minimal system information that's still collected

## Security Best Practices

1. **Principle of Least Privilege**: Only enable detailed system information gathering if you need it for your monitoring use case
2. **Security Monitoring**: Work with your security team to understand which specific commands trigger alerts
3. **Documentation**: Document your `systemInfo.enable` setting choice in your deployment documentation
4. **Testing**: Test configuration changes in a development environment first
5. **Monitoring**: Monitor Butler logs to ensure it's working correctly with your chosen configuration

## Version History

- **Current Version**: Added `systemInfo.enable` configuration option
- Initial implementation of system information gathering using systeminformation package