import { jest } from '@jest/globals';

describe('lib/mqtt_handlers', () => {
    let mqttInitHandlers;

    beforeAll(async () => {
        // Mock the 'sea' module (Node.js Single Executable Application support)
        await jest.unstable_mockModule('node:sea', () => ({
            __esModule: true,
            isSea: jest.fn(() => false),
            getAsset: jest.fn(),
        }));

        // Mock mqtt module
        const mockMqttClient = {
            on: jest.fn(),
            publish: jest.fn(),
            subscribe: jest.fn(),
            connected: false,
            options: { clientId: 'butler-test' },
        };

        const mockMqtt = {
            connect: jest.fn(() => mockMqttClient),
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
            get: jest.fn((key) => {
                const config = {
                    'Butler.mqttConfig.enable': true,
                    'Butler.mqttConfig.azureEventGrid.enable': false,
                    'Butler.mqttConfig.brokerHost': 'mqtt.example.com',
                    'Butler.mqttConfig.brokerPort': 1883,
                    'Butler.mqttConfig.taskStartTopic': 'qliksense/task/start',
                    'Butler.mqttConfig.subscriptionRootTopic': 'qliksense/#',
                    'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable': false,
                };
                return config[key] || null;
            }),
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

        await jest.unstable_mockModule('../qscloud/mqtt_event_app_reload_finished.js', () => ({
            handleQlikSenseCloudAppReloadFinished: jest.fn(),
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
});
