import { jest } from '@jest/globals';

describe('lib/mqtt_handlers', () => {
    let mqttInitHandlers;
    const mockMqtt = {
        connect: jest.fn(() => ({
            connected: false,
            options: { clientId: 'cid' },
            on: jest.fn(),
            publish: jest.fn(),
            subscribe: jest.fn(),
        })),
    };

    const mockGlobals = {
        mqttClient: undefined,
        mqttClientQlikSenseCloudEvent: undefined,
        getErrorMessage: (err) => err.message || String(err),
        config: {
            get: jest.fn(),
            has: jest.fn(() => false),
        },
        logger: {
            info: jest.fn(),
            verbose: jest.fn(),
            debug: jest.fn(),
            error: jest.fn(),
        },
    };

    const loadModule = async (cfg) => {
        jest.resetModules();
        await jest.unstable_mockModule('mqtt', () => ({ default: mockMqtt }));
        // prevent deep qscloud imports from requiring full config.has
        await jest.unstable_mockModule('../qscloud/mqtt_event_app_reload_finished.js', () => ({
            handleQlikSenseCloudAppReloadFinished: jest.fn(async () => ({})),
        }));
        await jest.unstable_mockModule('../qscloud/msteams_notification_qscloud.js', () => ({
            sendQlikSenseCloudAppReloadFailureNotificationTeams: jest.fn(),
        }));
        await jest.unstable_mockModule('../qscloud/slack_notification_qscloud.js', () => ({
            sendQlikSenseCloudAppReloadFailureNotificationSlack: jest.fn(),
        }));
        await jest.unstable_mockModule('../qscloud/email_notification_qscloud.js', () => ({
            sendQlikSenseCloudAppReloadFailureNotificationEmail: jest.fn(),
        }));
        mockGlobals.config.get.mockImplementation((k) => cfg[k]);
        mockGlobals.config.has.mockImplementation((k) => Object.prototype.hasOwnProperty.call(cfg, k));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        ({ default: mqttInitHandlers } = await import('../mqtt_handlers.js'));
    };

    test('does nothing when MQTT disabled', async () => {
        await loadModule({ 'Butler.mqttConfig.enable': false });
        mqttInitHandlers();
        expect(mockMqtt.connect).not.toHaveBeenCalled();
    });

    test('connects to standard broker when enabled', async () => {
        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': false,
            'Butler.mqttConfig.brokerHost': 'h',
            'Butler.mqttConfig.brokerPort': 1883,
            'Butler.mqttConfig.subscriptionRootTopic': 'root/#',
        });
        mqttInitHandlers();
        expect(mockMqtt.connect).toHaveBeenCalled();
        expect(mockGlobals.mqttClient).toBeDefined();
    });

    test('sets up QS Cloud MQTT when enabled', async () => {
        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable': true,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host': 'c-h',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.port': 8883,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.username': 'u',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.password': 'p',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.subscriptionRoot': 'cloud/#',
        });
        mqttInitHandlers();
        expect(mockMqtt.connect).toHaveBeenCalled();
        expect(mockGlobals.mqttClientQlikSenseCloudEvent).toBeDefined();
    });
});
