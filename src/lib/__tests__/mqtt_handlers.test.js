import { jest } from '@jest/globals';

describe('lib/mqtt_handlers', () => {
    let mqttInitHandlers;
    let mockMqtt;
    let handleQlikSenseCloudAppReloadFinished;

    // Config file values, which tests can change
    const configValues = {
        'Butler.mqttConfig.enable': true,
        'Butler.mqttConfig.azureEventGrid.enable': false,
        'Butler.mqttConfig.brokerHost': 'mqtt.example.com',
        'Butler.mqttConfig.brokerPort': 1883,
        'Butler.mqttConfig.taskStartTopic': 'qliksense/task/start',
        'Butler.mqttConfig.subscriptionRootTopic': 'qliksense/#',
        'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable': false,
    };

    beforeAll(async () => {
        // Mock the 'sea' module (Node.js Single Executable Application support)
        await jest.unstable_mockModule('node:sea', () => ({
            __esModule: true,
            isSea: jest.fn(() => false),
            getAsset: jest.fn(),
        }));

        // Mock mqtt module
        // Each client gets its own mocks, so tests can find the handlers set up on the client they are about
        mockMqtt = {
            connect: jest.fn(() => ({
                on: jest.fn(),
                publish: jest.fn(),
                subscribe: jest.fn(),
                connected: false,
                options: { clientId: 'butler-test' },
            })),
        };

        await jest.unstable_mockModule('mqtt', () => ({
            __esModule: true,
            default: mockMqtt,
        }));

        // Mock fs module
        await jest.unstable_mockModule('fs', () => ({
            default: {
                readFileSync: jest.fn(),
                existsSync: jest.fn(() => true),
            },
        }));

        // Mock globals.js with all required exports
        const mockLogger = {
            debug: jest.fn(),
            verbose: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        const mockConfig = {
            get: jest.fn((key) => configValues[key] || null),
        };

        await jest.unstable_mockModule('../../globals.js', () => ({
            default: {
                config: mockConfig,
                logger: mockLogger,
                getQRSHttpHeaders: jest.fn(() => ({})),
                mqttClient: null,
                mqttClientQlikSenseCloudEvent: null,
                getErrorMessage: jest.fn((err) => err?.message || 'Unknown error'),
                isSea: false,
            },
        }));

        // Mock other dependencies
        await jest.unstable_mockModule('../../qrs_util/sense_start_task.js', () => ({
            default: jest.fn().mockResolvedValue(true),
        }));

        handleQlikSenseCloudAppReloadFinished = jest.fn();
        await jest.unstable_mockModule('../qscloud/mqtt_event_app_reload_finished.js', () => ({
            handleQlikSenseCloudAppReloadFinished,
        }));

        await jest.unstable_mockModule('../../constants.js', () => ({
            HTTP_TIMEOUT_MS: 30000,
        }));

        // Now import the module under test
        const module = await import('../mqtt_handlers.js');
        mqttInitHandlers = module.default;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('module loads and exports mqttInitHandlers function', () => {
        expect(typeof mqttInitHandlers).toBe('function');
    });

    test('calling mqttInitHandlers does not throw', () => {
        expect(() => mqttInitHandlers()).not.toThrow();
    });

    describe('Qlik Sense Cloud events', () => {
        // A failed app reload, as Qlik Sense Cloud sends it in the legacy format
        const legacyEvent = {
            cloudEventsVersion: '0.1',
            source: 'com.qlik/engine',
            contentType: 'application/json',
            eventId: 'b0f5c473-5dea-4d7e-a188-5e0b904cde33',
            eventTime: '2026-11-06T10:15:00Z',
            eventTypeVersion: '1.0.0',
            eventType: 'com.qlik.v1.app.reload.finished',
            extensions: { ownerId: 'owner-1', tenantId: 'tenant-1', userId: 'user-1', topLevelResourceId: 'app-1' },
            data: { status: 'error', name: 'Sales forecast', reloadId: 'reload-1' },
        };

        // The same event in the CloudEvents format, the only format Qlik Sense Cloud sends from 10 December 2026
        const cloudEvent = {
            id: 'b0f5c473-5dea-4d7e-a188-5e0b904cde33',
            specversion: '1.0',
            source: 'com.qlik/engine',
            type: 'com.qlik.v1.app.reload.finished',
            time: '2026-11-06T10:15:00Z',
            datacontenttype: 'application/json',
            tenantid: 'tenant-1',
            userid: 'user-1',
            ownerid: 'owner-1',
            spaceid: 'space-1',
            toplevelresourceid: 'app-1',
            data: { status: 'error', name: 'Sales forecast', reloadId: 'reload-1' },
        };

        // The message handler of the MQTT client for Qlik Sense Cloud events
        let onQlikSenseCloudMessage;

        beforeEach(() => {
            Object.assign(configValues, {
                'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable': true,
                'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host': 'qscloud-mqtt.example.com',
                'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.port': 8765,
                'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.subscriptionRoot': 'qscloud/#',
                'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.appReload': 'qscloud/app/reload',
            });

            mqttInitHandlers();

            const clientIndex = mockMqtt.connect.mock.calls.findIndex(([url]) => url === 'mqtts://qscloud-mqtt.example.com:8765');
            const client = mockMqtt.connect.mock.results[clientIndex].value;
            [, onQlikSenseCloudMessage] = client.on.mock.calls.find(([event]) => event === 'message');
        });

        afterEach(() => {
            configValues['Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable'] = false;
        });

        test.each([
            ['the legacy format', legacyEvent],
            ['the CloudEvents format', cloudEvent],
            ['both formats', { ...legacyEvent, ...cloudEvent }],
        ])('passes an app reload finished event in %s on to its handler', async (_, event) => {
            await onQlikSenseCloudMessage('qscloud/app/reload/tenant-1', Buffer.from(JSON.stringify(event)));

            expect(handleQlikSenseCloudAppReloadFinished).toHaveBeenCalledTimes(1);
            expect(handleQlikSenseCloudAppReloadFinished).toHaveBeenCalledWith(event);
        });

        test('does not pass on other Qlik Sense Cloud events', async () => {
            const appOpenedEvent = { ...cloudEvent, type: 'com.qlik.v1.app.opened' };

            await onQlikSenseCloudMessage('qscloud/app/reload/tenant-1', Buffer.from(JSON.stringify(appOpenedEvent)));

            expect(handleQlikSenseCloudAppReloadFinished).not.toHaveBeenCalled();
        });
    });
});
