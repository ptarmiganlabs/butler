import { jest } from '@jest/globals';

describe('lib/mqtt_handlers', () => {
    let mqttInitHandlers;
    let mockClient;
    let mockSenseStartTask;
    let mockHandleQlikSenseCloudAppReloadFinished;
    let mockFs;
    let mockValidate;

    const mockMqtt = {
        connect: jest.fn(() => mockClient),
    };

    const mockGlobals = {
        mqttClient: undefined,
        mqttClientQlikSenseCloudEvent: undefined,
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
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeEach(() => {
        // Reset mock client before each test
        mockClient = {
            connected: false,
            options: { clientId: 'test-client-id' },
            on: jest.fn(),
            publish: jest.fn(),
            subscribe: jest.fn(),
        };

        mockMqtt.connect.mockReturnValue(mockClient);

        // Reset mocks
        jest.clearAllMocks();
        mockGlobals.mqttClient = undefined;
        mockGlobals.mqttClientQlikSenseCloudEvent = undefined;

        // Mock functions
        mockSenseStartTask = jest.fn();
        mockHandleQlikSenseCloudAppReloadFinished = jest.fn();
        mockFs = {
            readFileSync: jest.fn(() => 'mock-cert-content'),
            existsSync: jest.fn(() => true),
        };
        mockValidate = jest.fn(() => true);
    });

    const loadModule = async (cfg) => {
        jest.resetModules();
        await jest.unstable_mockModule('mqtt', () => ({ default: mockMqtt }));
        await jest.unstable_mockModule('uuid', () => ({ validate: mockValidate }));
        await jest.unstable_mockModule('fs', () => ({ default: mockFs }));
        await jest.unstable_mockModule('upath', () => ({
            default: {
                dirname: jest.fn(() => '/mock/path'),
                resolve: jest.fn((dir, file) => `/mock/path/${file}`),
            },
        }));
        await jest.unstable_mockModule('../../qrs_util/sense_start_task.js', () => ({
            default: mockSenseStartTask,
        }));
        // prevent deep qscloud imports from requiring full config.has
        await jest.unstable_mockModule('../qscloud/mqtt_event_app_reload_finished.js', () => ({
            handleQlikSenseCloudAppReloadFinished: mockHandleQlikSenseCloudAppReloadFinished,
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

    test('sets up Azure Event Grid MQTT when enabled', async () => {
        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': true,
            'Butler.mqttConfig.azureEventGrid.clientCertFile': 'client.crt',
            'Butler.mqttConfig.azureEventGrid.clientKeyFile': 'client.key',
            'Butler.mqttConfig.azureEventGrid.clientId': 'azure-client-id',
            'Butler.mqttConfig.brokerHost': 'azure-host',
            'Butler.mqttConfig.brokerPort': 8883,
            'Butler.mqttConfig.subscriptionRootTopic': 'azure/#',
        });

        mqttInitHandlers();

        expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/path/client.crt');
        expect(mockFs.existsSync).toHaveBeenCalledWith('/mock/path/client.key');
        expect(mockFs.readFileSync).toHaveBeenCalledWith('/mock/path/client.key');
        expect(mockFs.readFileSync).toHaveBeenCalledWith('/mock/path/client.crt');
        expect(mockMqtt.connect).toHaveBeenCalledWith(
            'mqtts://azure-host:8883',
            expect.objectContaining({
                clientId: 'azure-client-id',
                username: 'azure-client-id',
                key: 'mock-cert-content',
                cert: 'mock-cert-content',
                rejectUnauthorized: true,
            }),
        );
        expect(mockGlobals.mqttClient).toBeDefined();
    });

    test('handles missing certificate file for Azure Event Grid', async () => {
        mockFs.existsSync.mockReturnValueOnce(false); // cert file doesn't exist

        // Mock process.exit to prevent actual exit
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': true,
            'Butler.mqttConfig.azureEventGrid.clientCertFile': 'missing.crt',
            'Butler.mqttConfig.azureEventGrid.clientKeyFile': 'client.key',
            'Butler.mqttConfig.brokerHost': 'azure-host',
            'Butler.mqttConfig.brokerPort': 8883,
        });

        mqttInitHandlers();

        expect(mockGlobals.logger.error).toHaveBeenCalledWith('MQTT INIT HANDLERS: Certificate file /mock/path/missing.crt does not exist');
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
    });

    test('handles missing key file for Azure Event Grid', async () => {
        mockFs.existsSync
            .mockReturnValueOnce(true) // cert file exists
            .mockReturnValueOnce(false); // key file doesn't exist

        // Mock process.exit to prevent actual exit
        const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});

        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': true,
            'Butler.mqttConfig.azureEventGrid.clientCertFile': 'client.crt',
            'Butler.mqttConfig.azureEventGrid.clientKeyFile': 'missing.key',
            'Butler.mqttConfig.brokerHost': 'azure-host',
            'Butler.mqttConfig.brokerPort': 8883,
        });

        mqttInitHandlers();

        expect(mockGlobals.logger.error).toHaveBeenCalledWith('MQTT INIT HANDLERS: Key file /mock/path/missing.key does not exist');
        expect(mockExit).toHaveBeenCalledWith(1);

        mockExit.mockRestore();
    });

    test('handles MQTT connect event for standard broker', async () => {
        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': false,
            'Butler.mqttConfig.brokerHost': 'mqtt-host',
            'Butler.mqttConfig.brokerPort': 1883,
            'Butler.mqttConfig.subscriptionRootTopic': 'root/#',
        });

        mqttInitHandlers();

        // Simulate connect event
        const connectHandler = mockClient.on.mock.calls.find((call) => call[0] === 'connect')[1];
        connectHandler();

        expect(mockGlobals.logger.info).toHaveBeenCalledWith('Connected to MQTT server mqtt-host:1883, with client ID test-client-id');
        expect(mockClient.publish).toHaveBeenCalledWith(
            'qliksense/butler/mqtt/status',
            'Connected to MQTT broker mqtt-host:1883 with client ID test-client-id',
        );
        expect(mockClient.subscribe).toHaveBeenCalledWith('root/#');
    });

    test('handles MQTT message event for task start', async () => {
        mockSenseStartTask.mockResolvedValue(true);

        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': false,
            'Butler.mqttConfig.brokerHost': 'mqtt-host',
            'Butler.mqttConfig.brokerPort': 1883,
            'Butler.mqttConfig.subscriptionRootTopic': 'root/#',
            'Butler.mqttConfig.taskStartTopic': 'qliksense/start_task',
        });

        mqttInitHandlers();

        // Simulate message event
        const messageHandler = mockClient.on.mock.calls.find((call) => call[0] === 'message')[1];
        await messageHandler('qliksense/start_task', Buffer.from('550e8400-e29b-41d4-a716-446655440000'));

        expect(mockValidate).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000');
        // Note: senseStartTask is called via dynamic import, so we need to ensure the test waits properly
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(mockGlobals.logger.info).toHaveBeenCalledWith('MQTT IN: Started task ID 550e8400-e29b-41d4-a716-446655440000.');
    });

    test('handles invalid UUID in MQTT task start message', async () => {
        mockValidate.mockReturnValue(false);

        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': false,
            'Butler.mqttConfig.brokerHost': 'mqtt-host',
            'Butler.mqttConfig.brokerPort': 1883,
            'Butler.mqttConfig.subscriptionRootTopic': 'root/#',
            'Butler.mqttConfig.taskStartTopic': 'qliksense/start_task',
        });

        mqttInitHandlers();

        // Simulate message event with invalid UUID
        const messageHandler = mockClient.on.mock.calls.find((call) => call[0] === 'message')[1];
        await messageHandler('qliksense/start_task', Buffer.from('invalid-uuid'));

        expect(mockGlobals.logger.error).toHaveBeenCalledWith('MQTT IN: Invalid task ID invalid-uuid.');
        expect(mockSenseStartTask).not.toHaveBeenCalled();
    });

    test('handles task start failure', async () => {
        mockSenseStartTask.mockImplementation(() => {
            throw new Error('Task start failed');
        });

        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': false,
            'Butler.mqttConfig.brokerHost': 'mqtt-host',
            'Butler.mqttConfig.brokerPort': 1883,
            'Butler.mqttConfig.subscriptionRootTopic': 'root/#',
            'Butler.mqttConfig.taskStartTopic': 'qliksense/start_task',
        });

        mqttInitHandlers();

        // Simulate message event
        const messageHandler = mockClient.on.mock.calls.find((call) => call[0] === 'message')[1];
        await messageHandler('qliksense/start_task', Buffer.from('550e8400-e29b-41d4-a716-446655440000'));

        expect(mockGlobals.logger.error).toHaveBeenCalledWith(expect.stringContaining('MQTT MESSAGE: Error='));
    });

    test('handles task start returning false', async () => {
        mockSenseStartTask.mockResolvedValue(false);

        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': false,
            'Butler.mqttConfig.brokerHost': 'mqtt-host',
            'Butler.mqttConfig.brokerPort': 1883,
            'Butler.mqttConfig.subscriptionRootTopic': 'root/#',
            'Butler.mqttConfig.taskStartTopic': 'qliksense/start_task',
        });

        mqttInitHandlers();

        // Simulate message event
        const messageHandler = mockClient.on.mock.calls.find((call) => call[0] === 'message')[1];
        await messageHandler('qliksense/start_task', Buffer.from('550e8400-e29b-41d4-a716-446655440000'));

        expect(mockGlobals.logger.error).toHaveBeenCalledWith(
            'MQTT IN: Error while starting task ID 550e8400-e29b-41d4-a716-446655440000.',
        );
    });

    test('handles MQTT error event', async () => {
        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': false,
            'Butler.mqttConfig.brokerHost': 'mqtt-host',
            'Butler.mqttConfig.brokerPort': 1883,
            'Butler.mqttConfig.subscriptionRootTopic': 'root/#',
        });

        mqttInitHandlers();

        // Simulate error event
        const errorHandler = mockClient.on.mock.calls.find((call) => call[0] === 'error')[1];
        errorHandler('test-topic', 'test-error-message');

        expect(mockGlobals.logger.error).toHaveBeenCalledWith('MQTT ERROR: Topic: test-topic');
        expect(mockGlobals.logger.error).toHaveBeenCalledWith('MQTT ERROR: Message: test-error-message');
    });

    test('handles QS Cloud MQTT connect event', async () => {
        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable': true,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host': 'cloud-host',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.port': 8883,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.username': 'user',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.password': 'pass',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.subscriptionRoot': 'qscloud/#',
        });

        mqttInitHandlers();

        // Simulate connect event for QS Cloud client
        const connectHandler = mockClient.on.mock.calls.find((call) => call[0] === 'connect')[1];
        connectHandler();

        expect(mockGlobals.logger.info).toHaveBeenCalledWith(
            'MQTT QS CLOUD EVENT CONNECT: Connected to MQTT broker "mqtts://cloud-host:8883", with client ID test-client-id',
        );
        expect(mockClient.publish).toHaveBeenCalledWith(
            'butler/qscloud/event/mqttforward/status',
            'Connected to MQTT broker "mqtts://cloud-host:8883" with client ID test-client-id',
        );
        expect(mockClient.subscribe).toHaveBeenCalledWith('qscloud/#');
    });

    test('handles QS Cloud app reload finished message', async () => {
        mockHandleQlikSenseCloudAppReloadFinished.mockResolvedValue({});

        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable': true,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host': 'cloud-host',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.port': 8883,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.username': 'user',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.password': 'pass',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.subscriptionRoot': 'qscloud/#',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.appReload': 'qscloud/app/reload',
        });

        mqttInitHandlers();

        const mockMessage = {
            eventType: 'com.qlik.v1.app.reload.finished',
            appId: 'test-app-id',
            status: 'success',
        };

        // Simulate message event for QS Cloud client
        const messageHandler = mockClient.on.mock.calls.find((call) => call[0] === 'message')[1];
        await messageHandler('qscloud/app/reload/finished', Buffer.from(JSON.stringify(mockMessage)));

        expect(mockHandleQlikSenseCloudAppReloadFinished).toHaveBeenCalledWith(mockMessage);
    });

    test('ignores non-matching QS Cloud messages', async () => {
        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable': true,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host': 'cloud-host',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.port': 8883,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.username': 'user',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.password': 'pass',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.subscriptionRoot': 'qscloud/#',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.topic.appReload': 'qscloud/app/reload',
        });

        mqttInitHandlers();

        const mockMessage = {
            eventType: 'com.qlik.v1.app.some.other.event',
            appId: 'test-app-id',
        };

        // Simulate message event for QS Cloud client with non-matching topic
        const messageHandler = mockClient.on.mock.calls.find((call) => call[0] === 'message')[1];
        await messageHandler('qscloud/app/other', Buffer.from(JSON.stringify(mockMessage)));

        expect(mockHandleQlikSenseCloudAppReloadFinished).not.toHaveBeenCalled();
    });

    test('handles MQTT setup error for QSEoW', async () => {
        // Force an error by making mqtt.connect throw
        mockMqtt.connect.mockImplementation(() => {
            throw new Error('Connection failed');
        });

        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': false,
            'Butler.mqttConfig.brokerHost': 'mqtt-host',
            'Butler.mqttConfig.brokerPort': 1883,
        });

        mqttInitHandlers();

        expect(mockGlobals.logger.error).toHaveBeenCalledWith(
            expect.stringContaining('MQTT INIT HANDLERS: Could not set up MQTT for QSEoW:'),
        );
    });

    test('validates different UUID formats correctly', async () => {
        const validUuids = [
            '550e8400-e29b-41d4-a716-446655440000',
            'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        ];

        const invalidUuids = ['invalid-uuid', '550e8400-e29b-41d4-a716', '550e8400-e29b-41d4-a716-44665544000g', ''];

        // Test with valid UUIDs
        for (const uuid of validUuids) {
            mockValidate.mockReturnValue(true);
            mockSenseStartTask.mockResolvedValue(true);

            await loadModule({
                'Butler.mqttConfig.enable': true,
                'Butler.mqttConfig.azureEventGrid.enable': false,
                'Butler.mqttConfig.brokerHost': 'mqtt-host',
                'Butler.mqttConfig.brokerPort': 1883,
                'Butler.mqttConfig.subscriptionRootTopic': 'root/#',
                'Butler.mqttConfig.taskStartTopic': 'qliksense/start_task',
            });

            mqttInitHandlers();

            const messageHandler = mockClient.on.mock.calls.find((call) => call[0] === 'message')[1];
            await messageHandler('qliksense/start_task', Buffer.from(uuid));

            expect(mockValidate).toHaveBeenCalledWith(uuid);
        }

        // Test with invalid UUIDs
        for (const uuid of invalidUuids) {
            mockValidate.mockReturnValue(false);
            jest.clearAllMocks();

            await loadModule({
                'Butler.mqttConfig.enable': true,
                'Butler.mqttConfig.azureEventGrid.enable': false,
                'Butler.mqttConfig.brokerHost': 'mqtt-host',
                'Butler.mqttConfig.brokerPort': 1883,
                'Butler.mqttConfig.subscriptionRootTopic': 'root/#',
                'Butler.mqttConfig.taskStartTopic': 'qliksense/start_task',
            });

            mqttInitHandlers();

            const messageHandler = mockClient.on.mock.calls.find((call) => call[0] === 'message')[1];
            await messageHandler('qliksense/start_task', Buffer.from(uuid));

            expect(mockValidate).toHaveBeenCalledWith(uuid);
            expect(mockGlobals.logger.error).toHaveBeenCalledWith(`MQTT IN: Invalid task ID ${uuid}.`);
            expect(mockSenseStartTask).not.toHaveBeenCalled();
        }
    });

    test('handles MQTT setup error for QS Cloud', async () => {
        // Force an error by making mqtt.connect throw on second call
        mockMqtt.connect
            .mockReturnValueOnce(mockClient) // First call for QSEoW succeeds
            .mockImplementationOnce(() => {
                // Second call for QS Cloud fails
                throw new Error('QS Cloud connection failed');
            });

        await loadModule({
            'Butler.mqttConfig.enable': true,
            'Butler.mqttConfig.azureEventGrid.enable': false,
            'Butler.mqttConfig.brokerHost': 'mqtt-host',
            'Butler.mqttConfig.brokerPort': 1883,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.enable': true,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.host': 'cloud-host',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.port': 8883,
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.username': 'user',
            'Butler.mqttConfig.qlikSenseCloud.event.mqttForward.broker.password': 'pass',
        });

        mqttInitHandlers();

        expect(mockGlobals.logger.error).toHaveBeenCalledWith(
            expect.stringContaining('MQTT INIT HANDLERS: Could not set up MQTT for Qlik Sense Cloud:'),
        );
    });
});
