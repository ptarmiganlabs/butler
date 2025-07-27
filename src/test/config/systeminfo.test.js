import globals from '../../globals.js';

/**
 * Test system information configuration
 */
describe('System Information Configuration', () => {
    test('Should initialize globals with systemInfo enabled', async () => {
        // Mock config with systemInfo enabled
        const mockConfig = {
            get: jest.fn((key) => {
                switch (key) {
                    case 'Butler.systemInfo.enable':
                        return true;
                    case 'Butler.configQRS.host':
                        return 'localhost';
                    default:
                        return undefined;
                }
            }),
            has: jest.fn(() => true),
        };

        // Create a new instance of Settings for testing
        const testGlobals = {
            config: mockConfig,
            logger: {
                info: jest.fn(),
                warn: jest.fn(),
                error: jest.fn(),
            },
        };

        // Test that initHostInfo can be called without error
        const Settings = (await import('../../globals.js')).default;
        const settingsInstance = new Settings();
        settingsInstance.config = mockConfig;
        settingsInstance.logger = testGlobals.logger;

        const hostInfo = await settingsInstance.initHostInfo();

        expect(hostInfo).toBeTruthy();
        expect(hostInfo.id).toBeDefined();
        expect(hostInfo.si).toBeDefined();
        expect(hostInfo.si.os).toBeDefined();
    });

    test('Should initialize globals with systemInfo disabled', async () => {
        // Mock config with systemInfo disabled
        const mockConfig = {
            get: jest.fn((key) => {
                switch (key) {
                    case 'Butler.systemInfo.enable':
                        return false;
                    case 'Butler.configQRS.host':
                        return 'localhost';
                    default:
                        return undefined;
                }
            }),
            has: jest.fn(() => true),
        };

        const mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        // Test that initHostInfo works with disabled systemInfo
        const Settings = (await import('../../globals.js')).default;
        const settingsInstance = new Settings();
        settingsInstance.config = mockConfig;
        settingsInstance.logger = mockLogger;

        const hostInfo = await settingsInstance.initHostInfo();

        expect(hostInfo).toBeTruthy();
        expect(hostInfo.id).toBeDefined();
        expect(hostInfo.si).toBeDefined();
        expect(hostInfo.si.os).toBeDefined();
        expect(hostInfo.si.os.distro).toBe('unknown');
        expect(hostInfo.si.system.uuid).toBe('disabled');
        
        // Verify the info message was logged
        expect(mockLogger.info).toHaveBeenCalledWith(
            'SYSTEM INFO: Detailed system information gathering is disabled. Using minimal system info.'
        );
    });
});