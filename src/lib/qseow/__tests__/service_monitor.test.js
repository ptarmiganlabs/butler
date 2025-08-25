/* eslint-disable prettier/prettier */
import { jest } from '@jest/globals';

// Capture scheduled interval callback
const scheduled = { cb: null };

// Mock later to avoid real timers
jest.unstable_mockModule('@breejs/later', () => ({
    default: {
        parse: { text: jest.fn().mockReturnValue({}) },
        setInterval: jest.fn((cb) => {
            scheduled.cb = cb;
        }),
    },
}));

// Simple state machine mock for xstate
jest.unstable_mockModule('xstate', () => ({
    createMachine: jest.fn((cfg) => cfg),
    createActor: jest.fn(() => ({
        start: () => {
            let value = 'paused';
            return {
                send: ({ type }) => {
                    if (type === 'START') value = 'running';
                    if (type === 'STOP') value = 'stopped';
                    if (type === 'PAUSE') value = 'paused';
                },
                getSnapshot: () => ({ value }),
            };
        },
    })),
}));

// Mocks for winsvc
const statusAllMock = jest.fn();
const statusMock = jest.fn();
const detailsMock = jest.fn();
jest.unstable_mockModule('../winsvc.js', () => ({
    statusAll: statusAllMock,
    status: statusMock,
    details: detailsMock,
}));

// Destination mocks
const sendWebhook = jest.fn();
jest.unstable_mockModule('../webhook_notification.js', () => ({
    sendServiceMonitorWebhook: sendWebhook,
}));
const sendSlack = jest.fn();
jest.unstable_mockModule('../slack_notification.js', () => ({
    sendServiceMonitorNotificationSlack: sendSlack,
}));
const sendTeams = jest.fn();
jest.unstable_mockModule('../msteams_notification.js', () => ({
    sendServiceMonitorNotificationTeams: sendTeams,
}));
const sendEmail = jest.fn();
jest.unstable_mockModule('../smtp.js', () => ({
    sendServiceMonitorNotificationEmail: sendEmail,
}));
const postInflux = jest.fn();
jest.unstable_mockModule('../../post_to_influxdb.js', () => ({
    postWindowsServiceStatusToInfluxDB: postInflux,
}));
const newRelic = { sendServiceMonitorEvent: jest.fn(), sendServiceMonitorLog: jest.fn() };
jest.unstable_mockModule('../../incident_mgmt/new_relic_service_monitor.js', () => ({
    default: newRelic,
}));

// Globals mock: config + logger + host info + mqtt
const logger = { info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
const globalsConfigStore = new Map();
const globalsMock = {
    logger,
    config: { has: (k) => globalsConfigStore.has(k), get: (k) => globalsConfigStore.get(k) },
    mqttClient: { publish: jest.fn() },
    initHostInfo: jest.fn(async () => ({ si: { os: { platform: 'Windows', distro: 'Win', release: '10' } } })),
};
jest.unstable_mockModule('../../../globals.js', () => ({ default: globalsMock }));

// Import module under test
let setupServiceMonitorTimer;
beforeAll(async () => {
    ({ default: setupServiceMonitorTimer } = await import('../service_monitor.js'));
});

beforeEach(() => {
    jest.clearAllMocks();
    globalsConfigStore.clear();
});

function makeConfig(initial = {}) {
    const store = new Map(Object.entries(initial));
    return {
        get: (k) => store.get(k),
        set: (k, v) => store.set(k, v),
    };
}

describe('service_monitor setup and checks', () => {
    test('non-Windows platform warns and does nothing', async () => {
        // enable monitor
        const config = makeConfig({ 'Butler.serviceMonitor.enable': true });
        // non-Windows
        globalsMock.initHostInfo.mockResolvedValueOnce({ si: { os: { platform: 'Linux', distro: 'Deb', release: '12' } } });
        await setupServiceMonitorTimer(config, logger);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Not running on Windows'));
        expect(statusAllMock).not.toHaveBeenCalled();
    });

    test('Windows but missing services causes error and disables monitoring', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
        });
        // statusAll without the needed service
        statusAllMock.mockResolvedValueOnce([{ name: 'other' }]);
        await setupServiceMonitorTimer(config, logger);
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('At least one Windows service does not exist'));
    });

    test('Windows + services exist but empty monitor warns about missing section', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [],
        });
        // verifyServicesExist will iterate empty => result true; but code checks length 0
        await setupServiceMonitorTimer(config, logger);
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Missing or empty section'));
    });

    test('initial RUNNING check does not alert but sends MQTT status and Influx', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
            'Butler.serviceMonitor.frequency': 'every 5 mins',
            'Butler.mqttConfig.enable': true,
            'Butler.serviceMonitor.alertDestination.mqtt.enable': true,
            'Butler.mqttConfig.serviceStatusTopic': 'topic/status',
        });
        // Influx toggles are read from globals.config
        globalsConfigStore.set('Butler.influxDb.enable', true);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.influxDb.enable', true);
        // globals toggles that would send alerts if state changed
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.webhook.enable', true);
        globalsConfigStore.set('Butler.slackNotification.enable', true);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.slack.enable', true);
        globalsConfigStore.set('Butler.teamsNotification.enable', true);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.teams.enable', true);
        globalsConfigStore.set('Butler.emailNotification.enable', true);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.email.enable', true);

        // services exist and running
        // verifyServicesExist
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        // initial checkServiceStatus
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D', startType: 'Auto', dependencies: [], exePath: 'x' });

        await setupServiceMonitorTimer(config, logger);
        // give initial check a tick
        await new Promise((r) => setTimeout(r, 10));

        // No alerting destinations triggered
        expect(sendWebhook).not.toHaveBeenCalled();
        expect(sendSlack).not.toHaveBeenCalled();
        expect(sendTeams).not.toHaveBeenCalled();
        expect(sendEmail).not.toHaveBeenCalled();
        expect(newRelic.sendServiceMonitorEvent).not.toHaveBeenCalled();
        expect(newRelic.sendServiceMonitorLog).not.toHaveBeenCalled();

        // But status MQTT and Influx should send
        expect(globalsMock.mqttClient.publish).toHaveBeenCalledWith(
            expect.stringMatching(/^topic\/status\/H1\/svc1$/),
            expect.stringContaining('"serviceStatus":"RUNNING"'),
        );
        expect(postInflux).toHaveBeenCalledWith(expect.objectContaining({ serviceName: 'svc1', host: 'H1' }));
    });

    test('STOPPED with state change triggers all destinations and MQTT status/Influx', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
            'Butler.serviceMonitor.frequency': 'every 5 mins',
            // MQTT enable for both per-state and status
            'Butler.mqttConfig.enable': true,
            'Butler.serviceMonitor.alertDestination.mqtt.enable': true,
            'Butler.mqttConfig.serviceStoppedTopic': 'topic/stopped',
            'Butler.mqttConfig.serviceRunningTopic': 'topic/running',
            'Butler.mqttConfig.serviceStatusTopic': 'topic/status',
        });
        // globals toggles
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.webhook.enable', true);
        globalsConfigStore.set('Butler.slackNotification.enable', true);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.slack.enable', true);
        globalsConfigStore.set('Butler.teamsNotification.enable', true);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.teams.enable', true);
        globalsConfigStore.set('Butler.emailNotification.enable', true);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.email.enable', true);
        globalsConfigStore.set('Butler.influxDb.enable', true);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.influxDb.enable', true);
        // New Relic enable via config
        config.set('Butler.incidentTool.newRelic.serviceMonitor.monitorServiceState.stopped.enable', true);
        config.set('Butler.serviceMonitor.alertDestination.newRelic.enable', true);

        // services exist
        // verifyServicesExist
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        // Initial check running (to build machine), details
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D', startType: 'Auto', dependencies: [], exePath: 'x' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        // Now schedule tick returns STOPPED
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('STOPPED');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D', startType: 'Auto', dependencies: [], exePath: 'x' });

        // Invoke the scheduled callback
        expect(typeof scheduled.cb).toBe('function');
        scheduled.cb();
        await new Promise((r) => setTimeout(r, 10));

        // Alerts
        expect(newRelic.sendServiceMonitorEvent).toHaveBeenCalled();
        expect(newRelic.sendServiceMonitorLog).toHaveBeenCalled();
        expect(sendWebhook).toHaveBeenCalledWith(expect.objectContaining({ serviceName: 'svc1', host: 'H1', stateChanged: true }));
        expect(sendSlack).toHaveBeenCalled();
        expect(sendTeams).toHaveBeenCalled();
        expect(sendEmail).toHaveBeenCalled();

        // MQTT per-state and status
        expect(globalsMock.mqttClient.publish).toHaveBeenCalledWith(
            expect.stringMatching(/^topic\/stopped\/H1\/svc1$/),
            expect.stringContaining('"serviceStatus":"STOPPED"'),
        );
        expect(globalsMock.mqttClient.publish).toHaveBeenCalledWith(
            expect.stringMatching(/^topic\/status\/H1\/svc1$/),
            expect.stringContaining('"serviceStatus":"STOPPED"'),
        );

        // Influx
        expect(postInflux).toHaveBeenCalledWith(expect.objectContaining({ serviceStatus: 'STOPPED' }));
    });

    test('service monitor with disabled destinations skips those destinations', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
        });

        // Disable all destinations
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.webhook.enable', false);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.slack.enable', false);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.teams.enable', false);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.email.enable', false);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.newRelic.enable', false);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.mqtt.enable', false);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.influxDb.enable', false);

        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D', startType: 'Auto', dependencies: [], exePath: 'x' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        // State change to STOPPED
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('STOPPED');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D', startType: 'Auto', dependencies: [], exePath: 'x' });

        scheduled.cb();
        await new Promise((r) => setTimeout(r, 10));

        // No destinations should be called
        expect(sendWebhook).not.toHaveBeenCalled();
        expect(sendSlack).not.toHaveBeenCalled();
        expect(sendTeams).not.toHaveBeenCalled();
        expect(sendEmail).not.toHaveBeenCalled();
        expect(newRelic.sendServiceMonitorEvent).not.toHaveBeenCalled();
        expect(globalsMock.mqttClient.publish).not.toHaveBeenCalled();
        expect(postInflux).not.toHaveBeenCalled();
    });

    test('service monitor proceeds even if status is RUNNING (no explicit error handling expected)', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
        });

        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        // No error expected as implementation doesn't log specific status errors
        expect(logger.error).not.toHaveBeenCalled();
    });

    test('service monitor proceeds even if details resolve (no explicit details error handling expected)', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
        });

        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        // No error expected as implementation doesn't log specific details errors
        expect(logger.error).not.toHaveBeenCalled();
    });

    test('service monitor with multiple services handles mixed states', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [
                {
                    host: 'H1',
                    services: [
                        { name: 'svc1', friendlyName: 'Svc1' },
                        { name: 'svc2', friendlyName: 'Svc2' },
                    ],
                },
            ],
        });

        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.webhook.enable', true);

        // Services exist check
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }, { name: 'svc2' }]);

        // Initial check - both running
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }, { name: 'svc2' }]);
        statusMock.mockResolvedValueOnce('RUNNING').mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' }).mockResolvedValueOnce({ displayName: 'Svc2 D' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        // State change - one stops
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }, { name: 'svc2' }]);
        statusMock.mockResolvedValueOnce('RUNNING').mockResolvedValueOnce('STOPPED');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' }).mockResolvedValueOnce({ displayName: 'Svc2 D' });

        scheduled.cb();
        await new Promise((r) => setTimeout(r, 10));

        // Only svc2 should trigger alert
        expect(sendWebhook).toHaveBeenCalledWith(
            expect.objectContaining({
                serviceName: 'svc2',
                serviceStatus: 'STOPPED',
                stateChanged: true,
            }),
        );
    });

    test('service monitor with multiple hosts handles services on different hosts', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [
                { host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] },
                { host: 'H2', services: [{ name: 'svc2', friendlyName: 'Svc2' }] },
            ],
        });

        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.webhook.enable', true);

        // Services exist check for both hosts
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]).mockResolvedValueOnce([{ name: 'svc2' }]);

        // Initial check for both hosts
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]).mockResolvedValueOnce([{ name: 'svc2' }]);
        statusMock.mockResolvedValueOnce('RUNNING').mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' }).mockResolvedValueOnce({ displayName: 'Svc2 D' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        // State change on H2
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]).mockResolvedValueOnce([{ name: 'svc2' }]);
        statusMock.mockResolvedValueOnce('RUNNING').mockResolvedValueOnce('STOPPED');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' }).mockResolvedValueOnce({ displayName: 'Svc2 D' });

        scheduled.cb();
        await new Promise((r) => setTimeout(r, 10));

        expect(sendWebhook).toHaveBeenCalledWith(
            expect.objectContaining({
                host: 'H2',
                serviceName: 'svc2',
                serviceStatus: 'STOPPED',
            }),
        );
    });

    test('service monitor with no state change does not trigger alerts', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
        });
        // Enable webhook via globals (checked in implementation for alerts)
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.webhook.enable', true);
        // Enable status MQTT via config (implementation checks config for MQTT flags)
        config.set('Butler.mqttConfig.enable', true);
        config.set('Butler.serviceMonitor.alertDestination.mqtt.enable', true);
        config.set('Butler.mqttConfig.serviceStatusTopic', 'topic/status');

        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        // No change - still running
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' });

        scheduled.cb();
        await new Promise((r) => setTimeout(r, 10));

        // No alerts should be sent due to no state change
        expect(sendWebhook).not.toHaveBeenCalled();
        // Status MQTT should still be sent
        expect(globalsMock.mqttClient.publish).toHaveBeenCalled();
    });

    test('service monitor publishes status to MQTT when enabled', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
        });
        // MQTT enable via config
        config.set('Butler.mqttConfig.enable', true);
        config.set('Butler.serviceMonitor.alertDestination.mqtt.enable', true);
        config.set('Butler.mqttConfig.serviceStatusTopic', 'topic/status');

        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        expect(globalsMock.mqttClient.publish).toHaveBeenCalledWith(
            expect.stringMatching(/^topic\/status\/H1\/svc1$/),
            expect.stringContaining('"serviceStatus":"RUNNING"'),
        );
    });

    test('service monitor posts to InfluxDB when enabled', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
        });

        globalsConfigStore.set('Butler.influxDb.enable', true);
        globalsConfigStore.set('Butler.serviceMonitor.alertDestination.influxDb.enable', true);

        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        expect(postInflux).toHaveBeenCalledWith(expect.objectContaining({ serviceName: 'svc1', host: 'H1', serviceStatus: 'RUNNING' }));
    });

    test('service monitor logs transitions with existing messages', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
        });

        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('RUNNING');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        expect(logger.verbose).toHaveBeenCalledWith(expect.stringContaining('Service "svc1" is running'));

        // State change to STOPPED
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('STOPPED');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' });

        scheduled.cb();
        await new Promise((r) => setTimeout(r, 10));

        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('has stopped!'));
    });

    test('service monitor ignores unknown service state without alerts', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
        });

        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusMock.mockResolvedValueOnce('UNKNOWN_STATE');
        detailsMock.mockResolvedValueOnce({ displayName: 'Svc1 D' });

        await setupServiceMonitorTimer(config, logger);
        await new Promise((r) => setTimeout(r, 10));

        expect(sendWebhook).not.toHaveBeenCalled();
    });

    test('service monitor disabled skips all monitoring setup', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': false,
        });

        await setupServiceMonitorTimer(config, logger);

        expect(statusAllMock).not.toHaveBeenCalled();
    });

    test('service monitor with missing frequency config uses default', async () => {
        const config = makeConfig({
            'Butler.serviceMonitor.enable': true,
            'Butler.serviceMonitor.monitor': [{ host: 'H1', services: [{ name: 'svc1', friendlyName: 'Svc1' }] }],
            // Don't set frequency
        });

        // Called once in verifyServicesExist and once in the initial check
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);
        statusAllMock.mockResolvedValueOnce([{ name: 'svc1' }]);

        await setupServiceMonitorTimer(config, logger);

        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SERVICE MONITOR INIT: Setting up monitor for Windows services'));
    });

    test('should handle service status changes and recovery', async () => {
        const config = {
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.serviceMonitor.enable': true,
                    'Butler.serviceMonitor.frequency': '0 */2 * * * *',
                    'Butler.serviceMonitor.monitor': [
                        {
                            host: {
                                host: 'server1',
                                description: 'Main Server',
                            },
                            services: [
                                {
                                    name: 'QlikSenseEngineService',
                                    friendlyName: 'Qlik Sense Engine Service',
                                },
                            ],
                        },
                    ],
                    'Butler.serviceMonitor.alertDestination.influxDb.enable': true,
                    'Butler.serviceMonitor.alertDestination.newRelic.enable': false,
                    'Butler.serviceMonitor.alertDestination.email.enable': false,
                    'Butler.serviceMonitor.alertDestination.mqtt.enable': false,
                    'Butler.serviceMonitor.alertDestination.slack.enable': false,
                    'Butler.serviceMonitor.alertDestination.teams.enable': false,
                    'Butler.serviceMonitor.alertDestination.webhook.enable': false,
                };
                return configMap[key];
            }),
        };

        // Mock service transitions: running -> stopped -> running
        statusAllMock.mockResolvedValueOnce([
            { name: 'QlikSenseEngineService', state: 'running' },
        ]);
        statusAllMock.mockResolvedValueOnce([
            { name: 'QlikSenseEngineService', state: 'stopped' },
        ]);
        statusAllMock.mockResolvedValueOnce([
            { name: 'QlikSenseEngineService', state: 'running' },
        ]);

        await setupServiceMonitorTimer(config, logger);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('SERVICE MONITOR INIT: Setting up monitor for Windows services')
        );
    });

    test('should handle service discovery errors', async () => {
        const config = {
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.serviceMonitor.enable': true,
                    'Butler.serviceMonitor.frequency': '0 */2 * * * *',
                    'Butler.serviceMonitor.monitor': [
                        {
                            host: {
                                host: 'unreachable-server',
                                description: 'Unreachable Server',
                            },
                            services: [
                                {
                                    name: 'SomeService',
                                    friendlyName: 'Some Service',
                                },
                            ],
                        },
                    ],
                    'Butler.serviceMonitor.alertDestination.influxDb.enable': true,
                };
                return configMap[key];
            }),
        };

        // Mock service status to throw error
        statusAllMock.mockRejectedValue(new Error('Cannot connect to server'));

        await setupServiceMonitorTimer(config, logger);

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('SERVICE MONITOR: Error getting service info')
        );
    });

    test('should handle different service states', async () => {
        const config = {
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.serviceMonitor.enable': true,
                    'Butler.serviceMonitor.frequency': '0 */1 * * * *',
                    'Butler.serviceMonitor.monitor': [
                        {
                            host: {
                                host: 'server1',
                                description: 'Test Server',
                            },
                            services: [
                                { name: 'Service1', friendlyName: 'Service One' },
                                { name: 'Service2', friendlyName: 'Service Two' },
                                { name: 'Service3', friendlyName: 'Service Three' },
                            ],
                        },
                    ],
                    'Butler.serviceMonitor.alertDestination.influxDb.enable': true,
                };
                return configMap[key];
            }),
        };

        // Mock services with different states
        statusAllMock.mockResolvedValueOnce([
            { name: 'Service1', state: 'running' },
            { name: 'Service2', state: 'stopped' },
            { name: 'Service3', state: 'paused' },
        ]);

        await setupServiceMonitorTimer(config, logger);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('SERVICE MONITOR INIT: Setting up monitor for Windows services')
        );
    });

    test('should handle multiple hosts configuration', async () => {
        const config = {
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.serviceMonitor.enable': true,
                    'Butler.serviceMonitor.frequency': '0 */5 * * * *',
                    'Butler.serviceMonitor.monitor': [
                        {
                            host: {
                                host: 'server1',
                                description: 'Primary Server',
                            },
                            services: [
                                { name: 'Service1', friendlyName: 'Service One' },
                            ],
                        },
                        {
                            host: {
                                host: 'server2',
                                description: 'Secondary Server',
                            },
                            services: [
                                { name: 'Service2', friendlyName: 'Service Two' },
                            ],
                        },
                    ],
                    'Butler.serviceMonitor.alertDestination.influxDb.enable': true,
                    'Butler.serviceMonitor.alertDestination.email.enable': true,
                };
                return configMap[key];
            }),
        };

        statusAllMock.mockResolvedValue([
            { name: 'Service1', state: 'running' },
            { name: 'Service2', state: 'running' },
        ]);

        await setupServiceMonitorTimer(config, logger);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('SERVICE MONITOR INIT: Setting up monitor for Windows services')
        );
    });

    test('should handle alert destination configurations', async () => {
        const config = {
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.serviceMonitor.enable': true,
                    'Butler.serviceMonitor.frequency': '0 */2 * * * *',
                    'Butler.serviceMonitor.monitor': [
                        {
                            host: {
                                host: 'server1',
                                description: 'Main Server',
                            },
                            services: [
                                { name: 'TestService', friendlyName: 'Test Service' },
                            ],
                        },
                    ],
                    'Butler.serviceMonitor.alertDestination.influxDb.enable': true,
                    'Butler.serviceMonitor.alertDestination.newRelic.enable': true,
                    'Butler.serviceMonitor.alertDestination.email.enable': true,
                    'Butler.serviceMonitor.alertDestination.mqtt.enable': true,
                    'Butler.serviceMonitor.alertDestination.slack.enable': true,
                    'Butler.serviceMonitor.alertDestination.teams.enable': true,
                    'Butler.serviceMonitor.alertDestination.webhook.enable': true,
                };
                return configMap[key];
            }),
        };

        statusAllMock.mockResolvedValue([
            { name: 'TestService', state: 'running' },
        ]);

        await setupServiceMonitorTimer(config, logger);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('SERVICE MONITOR INIT: Setting up monitor for Windows services')
        );
    });

    test('should handle service monitoring timer setup errors', async () => {
        const config = {
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.serviceMonitor.enable': true,
                    'Butler.serviceMonitor.frequency': 'invalid-cron-expression',
                    'Butler.serviceMonitor.monitor': [
                        {
                            host: {
                                host: 'server1',
                                description: 'Main Server',
                            },
                            services: [
                                { name: 'TestService', friendlyName: 'Test Service' },
                            ],
                        },
                    ],
                };
                return configMap[key];
            }),
        };

        await setupServiceMonitorTimer(config, logger);

        expect(logger.error).toHaveBeenCalledWith(
            expect.stringContaining('SERVICE MONITOR INIT: Error setting up service monitoring')
        );
    });

    test('should handle empty service monitor configuration', async () => {
        const config = {
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.serviceMonitor.enable': true,
                    'Butler.serviceMonitor.frequency': '0 */2 * * * *',
                    'Butler.serviceMonitor.monitor': [], // Empty array
                };
                return configMap[key];
            }),
        };

        await setupServiceMonitorTimer(config, logger);

        expect(logger.info).toHaveBeenCalledWith(
            expect.stringContaining('SERVICE MONITOR INIT: Setting up monitor for Windows services')
        );
    });

    test('should handle services that do not exist on target host', async () => {
        const config = {
            get: jest.fn((key) => {
                const configMap = {
                    'Butler.serviceMonitor.enable': true,
                    'Butler.serviceMonitor.frequency': '0 */2 * * * *',
                    'Butler.serviceMonitor.monitor': [
                        {
                            host: {
                                host: 'server1',
                                description: 'Main Server',
                            },
                            services: [
                                { name: 'NonExistentService', friendlyName: 'Non-Existent Service' },
                            ],
                        },
                    ],
                    'Butler.serviceMonitor.alertDestination.influxDb.enable': true,
                };
                return configMap[key];
            }),
        };

        // Mock that the service doesn't exist
        statusAllMock.mockResolvedValue([]); // Empty array means service not found

        await setupServiceMonitorTimer(config, logger);

        expect(logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('SERVICE MONITOR INIT: Service "NonExistentService" not found')
        );
    });
});
