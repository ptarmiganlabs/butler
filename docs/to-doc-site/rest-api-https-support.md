# Butler REST API HTTPS support

Butler can expose its public REST API over HTTPS by enabling TLS in `Butler.restServerConfig.tls`.

## Configuration

Add the following settings to the Butler YAML config file:

```yaml
Butler:
    restServerConfig:
        enable: true
        serverHost: butler.example.com
        serverPort: 8443
        backgroundServerPort: 8081
        tls:
            enable: true
            cert: /path/to/cert/certfile.pem
            key: /path/to/cert/keyfile.pem
            ca: /path/to/cert/ca-bundle.pem # Optional. Use null if not needed.
```

If `tls.enable` is `false`, Butler keeps serving the public REST API over HTTP exactly as before.

## Runtime behavior

- `serverPort` is the public Butler REST API listener.
- `backgroundServerPort` is still used for Butler's internal Fastify instance behind the local reverse proxy.
- When TLS is enabled, Butler loads the PEM files from `tls.cert`, `tls.key`, and optionally `tls.ca` during startup.
- Startup fails with a clear error if Butler cannot read the configured TLS files.
- Swagger/OpenAPI metadata and the startup log message for `/documentation` switch from `http://...` to `https://...` automatically when TLS is enabled.

## Validation

- The config file schema now validates `Butler.restServerConfig.tls`.
- `tls.enable`, `tls.cert`, `tls.key`, and `tls.ca` are part of the schema-validated config structure.
- `tls.ca` accepts either a filesystem path or `null`.

## Operational notes

- Use absolute certificate paths whenever possible.
- The certificate and key must be PEM encoded and match each other.
- `tls.ca` is optional; set it to `null` when no CA/intermediate bundle should be loaded.
