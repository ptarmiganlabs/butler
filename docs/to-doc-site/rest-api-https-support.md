# Butler REST API HTTPS support

Butler's REST API can now be exposed over HTTPS/TLS by enabling TLS under `Butler.restServerConfig`.

## Configuration

Add the following settings to the Butler YAML config file:

```yaml
Butler:
    restServerConfig:
        enable: true
        serverHost: 0.0.0.0
        serverPort: 8080
        backgroundServerPort: 8081
        tls:
            enable: true
            cert: /path/to/cert/certfile.pem
            key: /path/to/cert/keyfile.pem
            ca: /path/to/cert/root.pem
```

## Setting details

- `tls.enable`: Enables HTTPS for the public Butler REST API.
- `tls.cert`: Path to a PEM encoded server certificate.
- `tls.key`: Path to a PEM encoded private key for the certificate.
- `tls.ca`: Optional path to a PEM encoded CA/root certificate bundle. This is typically useful when you use a self-signed certificate or need clients to see a custom certificate chain.

## Runtime behaviour

- When `tls.enable` is `false`, Butler behaves exactly as before and serves the public REST API over HTTP.
- When `tls.enable` is `true`, Butler serves the public REST API over HTTPS on `restServerConfig.serverPort`.
- Butler's internal background REST server continues to use `backgroundServerPort` for intra-process proxying.
- Swagger/OpenAPI metadata and the startup log message for the API documentation URL use `https://` automatically when TLS is enabled.

## Validation

- The new `restServerConfig.tls` block is validated by Butler's config schema.
- `enable`, `cert`, and `key` are required entries in the `tls` block.
- `ca` is optional and may be omitted or set to `null`.

## Operational notes

- Certificate and key files must be readable by the Butler process.
- The certificate and key must be PEM encoded and match each other.
- If Butler is reverse proxied by another HTTPS terminator, leave `tls.enable` set to `false` unless Butler itself should terminate TLS.
