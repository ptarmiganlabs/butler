import Influx from 'influx';
import { InfluxDB as InfluxDB2, Point as Point2 } from '@influxdata/influxdb-client';
import { InfluxDBClient as InfluxDB3, Point as Point3, setLogger as setInfluxV3Logger } from '@influxdata/influxdb3-client';

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

export function getInfluxDbVersion(config) {
    const version = Number(safeConfigGet(config, 'Butler.influxDb.version', 1));
    return Number.isNaN(version) ? 1 : version;
}

export function getInfluxDbHost(config) {
    return safeConfigGet(config, 'Butler.influxDb.hostIP', '');
}

export function getInfluxDbPort(config) {
    return safeConfigGet(config, 'Butler.influxDb.hostPort', 8086);
}

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

export function getInfluxDbV2Config(config) {
    return safeConfigGet(config, 'Butler.influxDb.v2Config', {});
}

export function getInfluxDbV3Config(config) {
    return safeConfigGet(config, 'Butler.influxDb.v3Config', {});
}

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

class InfluxDbCompatClient {
    constructor({ version, client, org, bucket, database }) {
        this.version = version;
        this.client = client;
        this.org = org;
        this.bucket = bucket;
        this.database = database;
        this.writeApi = null;
    }

    async writePoints(points) {
        if (!Array.isArray(points) || points.length === 0) {
            return;
        }

        if (this.version === 1) {
            await this.client.writePoints(points);
            return;
        }

        if (this.version === 2) {
            if (this.writeApi === null) {
                this.writeApi = this.client.getWriteApi(this.org, this.bucket);
            }

            this.writeApi.writePoints(points.map((point) => createPointV2(point)));
            await this.writeApi.flush();

            return;
        }

        if (this.version === 3) {
            const lineProtocol = points
                .map((point) => createPointV3(point))
                .map((point) => point.toLineProtocol())
                .join('\n');

            await this.client.write(lineProtocol, this.database);
        }
    }

    async getDatabaseNames() {
        if (this.version === 1) {
            return this.client.getDatabaseNames();
        }

        return this.database ? [this.database] : [];
    }

    async createDatabase(name) {
        if (this.version === 1) {
            return this.client.createDatabase(name);
        }

        return undefined;
    }

    async createRetentionPolicy(name, options) {
        if (this.version === 1) {
            return this.client.createRetentionPolicy(name, options);
        }

        return undefined;
    }
}

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
            throw new Error('Invalid InfluxDB v2 config: org, bucket and token are required.');
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
