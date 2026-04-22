import Influx from 'influx';
import { InfluxDB as InfluxDB2, Point as Point2 } from '@influxdata/influxdb-client';
import { InfluxDBClient as InfluxDB3, Point as Point3, setLogger as setInfluxV3Logger } from '@influxdata/influxdb3-client';

/**
 * Legacy point payload accepted throughout Butler's existing metric/event producers.
 *
 * @typedef {object} LegacyInfluxPoint
 * @property {string} measurement Measurement name.
 * @property {Record<string, string | number | boolean | null | undefined>} [tags] Point tags.
 * @property {Record<string, string | number | boolean | null | undefined>} [fields] Point fields.
 * @property {Date | number | string} [timestamp] Optional timestamp forwarded to the target client.
 */

/**
 * Handlers used when converting legacy point fields into version-specific point builders.
 *
 * @typedef {object} LegacyFieldHandlers
 * @property {(key: string, value: number) => void} number Handler for numeric fields.
 * @property {(key: string, value: boolean) => void} boolean Handler for boolean fields.
 * @property {(key: string, value: string) => void} string Handler for string fields.
 */

/**
 * Safe config getter that works with the `config` package as well as
 * simple mocked config objects used in tests.
 *
 * @param {object} config Config object.
 * @param {string} path Config path.
 * @param {*} fallback Fallback value.
 * @returns {*} Config value or fallback.
 */
function safeConfigGet(config, path, fallback = undefined) {
    try {
        if (typeof config?.has === 'function' && config.has(path) === false) {
            return fallback;
        }

        const value = config.get(path);
        return value === undefined ? fallback : value;
    } catch {
        return fallback;
    }
}

/**
 * Returns the configured InfluxDB major version and defaults to v1 for legacy configs.
 *
 * @param {object} config Config object.
 * @returns {number} Supported InfluxDB version number.
 */
export function getInfluxDbVersion(config) {
    const version = Number(safeConfigGet(config, 'Butler.influxDb.version', 1));
    return Number.isNaN(version) ? 1 : version;
}

/**
 * Returns the configured InfluxDB host name or IP address.
 *
 * @param {object} config Config object.
 * @returns {string} InfluxDB host.
 */
export function getInfluxDbHost(config) {
    return safeConfigGet(config, 'Butler.influxDb.hostIP', '');
}

/**
 * Returns the configured InfluxDB port and falls back to the default HTTP port.
 *
 * @param {object} config Config object.
 * @returns {number} InfluxDB port.
 */
export function getInfluxDbPort(config) {
    return safeConfigGet(config, 'Butler.influxDb.hostPort', 8086);
}

/**
 * Returns the normalized InfluxDB v1 configuration.
 *
 * If the new `v1Config` block is absent, legacy flat v1 settings are mapped into the
 * same shape so the rest of the client setup can treat both config styles identically.
 *
 * @param {object} config Config object.
 * @returns {{auth: {enable: boolean, username: string, password: string}, dbName: string, retentionPolicy: {name: string, duration: string}}} Normalized v1 config.
 */
export function getInfluxDbV1Config(config) {
    return (
        safeConfigGet(config, 'Butler.influxDb.v1Config', null) ?? {
            auth: safeConfigGet(config, 'Butler.influxDb.auth', {
                enable: false,
                username: '',
                password: '',
            }),
            dbName: safeConfigGet(config, 'Butler.influxDb.dbName', 'butler'),
            retentionPolicy: safeConfigGet(config, 'Butler.influxDb.retentionPolicy', {
                name: '10d',
                duration: '10d',
            }),
        }
    );
}

/**
 * Returns the configured InfluxDB v2 settings.
 *
 * @param {object} config Config object.
 * @returns {object} v2 config block.
 */
export function getInfluxDbV2Config(config) {
    return safeConfigGet(config, 'Butler.influxDb.v2Config', {});
}

/**
 * Returns the configured InfluxDB v3 settings.
 *
 * @param {object} config Config object.
 * @returns {object} v3 config block.
 */
export function getInfluxDbV3Config(config) {
    return safeConfigGet(config, 'Butler.influxDb.v3Config', {});
}

/**
 * Copies supported legacy fields into the point builder used by the active client version.
 *
 * Only string, number, and boolean fields are forwarded because those are the field
 * types emitted by Butler's current producers and supported by the target clients.
 *
 * @param {Record<string, string | number | boolean | null | undefined> | undefined} fields Legacy field map.
 * @param {LegacyFieldHandlers} handlers Type-specific field handlers.
 * @returns {void}
 */
function addLegacyFieldsToPoint(fields, handlers) {
    Object.entries(fields ?? {}).forEach(([key, value]) => {
        if (typeof value === 'number') {
            handlers.number(key, value);
        } else if (typeof value === 'boolean') {
            handlers.boolean(key, value);
        } else if (typeof value === 'string') {
            handlers.string(key, value);
        }
    });
}

/**
 * Converts a Butler legacy point into an InfluxDB v2 client point.
 *
 * @param {LegacyInfluxPoint} point Legacy Butler point.
 * @returns {Point2} InfluxDB v2 point instance.
 */
function createPointV2(point) {
    const convertedPoint = new Point2(point.measurement);

    Object.entries(point.tags ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            convertedPoint.tag(key, String(value));
        }
    });

    addLegacyFieldsToPoint(point.fields, {
        number: (key, value) => convertedPoint.floatField(key, value),
        boolean: (key, value) => convertedPoint.booleanField(key, value),
        string: (key, value) => convertedPoint.stringField(key, value),
    });

    if (point.timestamp) {
        convertedPoint.timestamp(point.timestamp);
    }

    return convertedPoint;
}

/**
 * Converts a Butler legacy point into an InfluxDB v3 client point.
 *
 * @param {LegacyInfluxPoint} point Legacy Butler point.
 * @returns {Point3} InfluxDB v3 point instance.
 */
function createPointV3(point) {
    const convertedPoint = Point3.measurement(point.measurement);

    Object.entries(point.tags ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            convertedPoint.setTag(key, String(value));
        }
    });

    addLegacyFieldsToPoint(point.fields, {
        number: (key, value) => convertedPoint.setFloatField(key, value),
        boolean: (key, value) => convertedPoint.setBooleanField(key, value),
        string: (key, value) => convertedPoint.setStringField(key, value),
    });

    if (point.timestamp) {
        convertedPoint.setTimestamp(point.timestamp);
    }

    return convertedPoint;
}

/**
 * Compatibility wrapper that preserves Butler's historical InfluxDB call surface.
 *
 * Existing producers can keep calling `writePoints(...)`, `getDatabaseNames()`,
 * `createDatabase()`, and `createRetentionPolicy()` while this wrapper delegates to
 * the correct client library for the configured InfluxDB version.
 */
class InfluxDbCompatClient {
    /**
     * Creates a version-aware compatibility client.
     *
     * @param {object} options Constructor options.
     * @param {number} options.version Configured InfluxDB version.
     * @param {object} options.client Underlying client instance for the selected version.
     * @param {string} [options.org] InfluxDB v2 organization.
     * @param {string} [options.bucket] InfluxDB v2 bucket.
     * @param {string} [options.database] InfluxDB database name.
     */
    constructor({ version, client, org, bucket, database }) {
        this.version = version;
        this.client = client;
        this.org = org;
        this.bucket = bucket;
        this.database = database;
        this.writeApi = null;
    }

    /**
     * Writes legacy Butler points using the client library for the active InfluxDB version.
     *
     * @param {LegacyInfluxPoint[]} points Points to write.
     * @returns {Promise<void>} Resolves when the points have been submitted.
     * @throws {Error} If the write fails for any InfluxDB version.
     */
    async writePoints(points) {
        if (!Array.isArray(points) || points.length === 0) {
            return;
        }

        try {
            if (this.version === 1) {
                await this.client.writePoints(points);
                return;
            }

            if (this.version === 2) {
                if (this.writeApi === null) {
                    // Reuse a single WriteApi to avoid the overhead of recreating it for every write.
                    this.writeApi = this.client.getWriteApi(this.org, this.bucket);
                }

                this.writeApi.writePoints(points.map((point) => createPointV2(point)));
                // Flush after each call so Butler keeps the same "await writePoints()" behavior as before.
                await this.writeApi.flush();

                return;
            }

            if (this.version === 3) {
                // The v3 client writes line protocol, so convert compat points before submitting them.
                const lineProtocol = points
                    .map((point) => createPointV3(point))
                    .map((point) => point.toLineProtocol())
                    .join('\n');

                await this.client.write(lineProtocol, this.database);
            }
        } catch (err) {
            const versionMsg = `InfluxDB v${this.version}`;
            const error = new Error(`${versionMsg} write error: ${err.message}`);
            error.cause = err;
            throw error;
        }
    }

    /**
     * Returns known database names for compatibility with Butler's startup checks.
     *
     * For v2/v3, Butler already targets an explicitly configured bucket/database, so this
     * method returns a minimal synthetic list instead of querying server-side metadata.
     *
     * @returns {Promise<string[]>} Database names known to the compatibility layer.
     */
    async getDatabaseNames() {
        if (this.version === 1) {
            return this.client.getDatabaseNames();
        }

        return this.database ? [this.database] : [];
    }

    /**
     * Creates a database when supported by the underlying client.
     *
     * @param {string} name Database name.
     * @returns {Promise<*>} Underlying client result, or `undefined` when unsupported.
     */
    async createDatabase(name) {
        if (this.version === 1) {
            return this.client.createDatabase(name);
        }

        return undefined;
    }

    /**
     * Creates a retention policy when supported by the underlying client.
     *
     * @param {string} name Retention policy name.
     * @param {object} options Retention policy options.
     * @returns {Promise<*>} Underlying client result, or `undefined` when unsupported.
     */
    async createRetentionPolicy(name, options) {
        if (this.version === 1) {
            return this.client.createRetentionPolicy(name, options);
        }

        return undefined;
    }
}

/**
 * Creates the version-aware InfluxDB compatibility client used by Butler at runtime.
 *
 * @param {object} config Config object.
 * @returns {InfluxDbCompatClient} Compatibility client for the configured InfluxDB version.
 * @throws {Error} If the configured InfluxDB version is unsupported or required config is missing.
 */
export function createInfluxDbClient(config) {
    const version = getInfluxDbVersion(config);
    const host = getInfluxDbHost(config);
    const port = getInfluxDbPort(config);

    if (version === 1) {
        const v1Config = getInfluxDbV1Config(config);

        return new InfluxDbCompatClient({
            version,
            client: new Influx.InfluxDB({
                host,
                port: String(port),
                database: v1Config.dbName,
                username: v1Config.auth?.enable ? v1Config.auth?.username : '',
                password: v1Config.auth?.enable ? v1Config.auth?.password : '',
                schema: [],
            }),
            database: v1Config.dbName,
        });
    }

    if (version === 2) {
        const v2Config = getInfluxDbV2Config(config);

        if (!v2Config.org || !v2Config.bucket || !v2Config.token) {
            throw new Error('Invalid InfluxDB v2 config: org, bucket, and token are required.');
        }

        return new InfluxDbCompatClient({
            version,
            client: new InfluxDB2({
                url: `http://${host}:${port}`,
                token: v2Config.token,
            }),
            org: v2Config.org,
            bucket: v2Config.bucket,
        });
    }

    if (version === 3) {
        const v3Config = getInfluxDbV3Config(config);

        if (!v3Config.database || !v3Config.token) {
            throw new Error('Invalid InfluxDB v3 config: database and token are required.');
        }

        // Butler logs write failures itself, so the library logger is muted to avoid duplicate noise.
        setInfluxV3Logger({
            error() {},
            warn() {},
        });

        return new InfluxDbCompatClient({
            version,
            client: new InfluxDB3({
                host: `http://${host}:${port}`,
                token: v3Config.token,
                database: v3Config.database,
                timeout: v3Config.writeTimeout ?? 10000,
            }),
            database: v3Config.database,
        });
    }

    throw new Error(`Unsupported InfluxDB version: ${version}`);
}
