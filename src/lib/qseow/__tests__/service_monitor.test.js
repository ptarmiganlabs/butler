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
});
