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

function createPointV2(point) {
    const convertedPoint = new Point2(point.measurement);

    Object.entries(point.tags ?? {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            convertedPoint.tag(key, String(value));
        }
    });

    Object.entries(point.fields ?? {}).forEach(([key, value]) => {
        if (typeof value === 'number') {
            convertedPoint.floatField(key, value);
        } else if (typeof value === 'boolean') {
            convertedPoint.booleanField(key, value);
        } else if (typeof value === 'string') {
            convertedPoint.stringField(key, value);
        }
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

    Object.entries(point.fields ?? {}).forEach(([key, value]) => {
        if (typeof value === 'number') {
            convertedPoint.setFloatField(key, value);
        } else if (typeof value === 'boolean') {
            convertedPoint.setBooleanField(key, value);
        } else if (typeof value === 'string') {
            convertedPoint.setStringField(key, value);
        }
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
            const writeApi = this.client.getWriteApi(this.org, this.bucket);

            try {
                writeApi.writePoints(points.map((point) => createPointV2(point)));
                await writeApi.close();
            } catch (err) {
                try {
                    await writeApi.close();
                } catch {
                    // Ignore close errors after the original write failure.
                }

                throw err;
            }

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

        setInfluxV3Logger({
            // Butler logs write failures itself, so the library logger is muted to avoid duplicate noise.
            error() {},
            // Butler logs write failures itself, so the library logger is muted to avoid duplicate noise.
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
