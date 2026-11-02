import { jest } from '@jest/globals';

// Mock globals module
const mockGlobals = {
    logger: {
        verbose: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
    config: {
        get: jest.fn(),
        has: jest.fn(),
    },
    getErrorMessage: jest.fn((err) => err.message || err.toString()),
};

jest.unstable_mockModule('../../../../globals.js', () => ({
    default: mockGlobals,
}));

// Mock dependencies
const mockGetScriptLog = jest.fn();
const mockFailedTaskStoreLogOnDisk = jest.fn();
jest.unstable_mockModule('../../../../lib/qseow/scriptlog.js', () => ({
    getScriptLog: mockGetScriptLog,
    failedTaskStoreLogOnDisk: mockFailedTaskStoreLogOnDisk,
}));

const mockGetAppMetadata = jest.fn();
jest.unstable_mockModule('../../../../qrs_util/app_metadata.js', () => ({
    default: mockGetAppMetadata,
}));

jest.unstable_mockModule('../../../../lib/qseow/smtp/reload-task-failed.js', () => ({
    sendReloadTaskFailureNotificationEmail: jest.fn(),
}));
jest.unstable_mockModule('../../../../lib/qseow/slack_notification.js', () => ({
    sendReloadTaskFailureNotificationSlack: jest.fn(),
}));
jest.unstable_mockModule('../../../../lib/qseow/webhook_notification.js', () => ({
    sendReloadTaskFailureNotificationWebhook: jest.fn(),
}));
jest.unstable_mockModule('../../../../lib/qseow/msteams_notification.js', () => ({
    sendReloadTaskFailureNotificationTeams: jest.fn(),
}));
jest.unstable_mockModule('../../../../lib/incident_mgmt/signl4.js', () => ({
    sendReloadTaskFailureNotification: jest.fn(),
}));
jest.unstable_mockModule('../../../../lib/incident_mgmt/new_relic.js', () => ({
    sendReloadTaskFailureLog: jest.fn(),
    sendReloadTaskFailureEvent: jest.fn(),
}));
jest.unstable_mockModule('../../../../lib/influxdb/task_failure.js', () => ({
    postReloadTaskFailureNotificationInfluxDb: jest.fn(),
}));

let handleFailedReloadTask;

beforeAll(async () => {
    ({ handleFailedReloadTask } = await import('../failed_reload.js'));
});

describe('handleFailedReloadTask script log retrieval', () => {
    const msg = [
        '/scheduler-reload-failed/',
        'server1.example.com',
        'Test Reload Task',
        'Test App',
        'DOMAIN\\user1',
        'task-123-reload',
        'app-456',
        '2024-01-15 10:30:00,000',
        'ERROR',
        'exec-789',
        'Reload failed',
    ];
    const taskMetadata = { taskType: 0, tags: [], customProperties: [] };
    const scriptLog = { executingNodeName: 'node1', scriptLogFull: ['Starting reload', 'Error: table not found'] };

    // Settings that decide whether the script log is needed. Each test turns on the ones it needs.
    let config;

    beforeEach(() => {
        jest.clearAllMocks();

        config = {
            'Butler.incidentTool.newRelic.enable': false,
            'Butler.slackNotification.enable': false,
            'Butler.teamsNotification.enable': false,
            'Butler.influxDb.reloadTaskFailure.enable': false,
            'Butler.emailNotification.enable': false,
            'Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.enable': false,
        };
        mockGlobals.config.get.mockImplementation((key) => config[key]);
        mockGlobals.config.has.mockReturnValue(false);

        mockGetScriptLog.mockResolvedValue(scriptLog);
        mockGetAppMetadata.mockResolvedValue({ id: 'app-456', name: 'Test App', tags: [], customProperties: [] });
    });

    test('should get the script log and store it on disk when that is its only use', async () => {
        config['Butler.scriptLog.storeOnDisk.clientManaged.reloadTaskFailure.enable'] = true;

        await handleFailedReloadTask(msg, taskMetadata);

        expect(mockGlobals.logger.error).not.toHaveBeenCalled();
        expect(mockGetScriptLog).toHaveBeenCalledWith('task-123-reload', 0, 0);
        expect(mockFailedTaskStoreLogOnDisk).toHaveBeenCalledWith(expect.objectContaining({ taskId: 'task-123-reload', scriptLog }));
    });

    test('should get the script log when a notification channel needs it', async () => {
        config['Butler.emailNotification.enable'] = true;

        await handleFailedReloadTask(msg, taskMetadata);

        expect(mockGlobals.logger.error).not.toHaveBeenCalled();
        expect(mockGetScriptLog).toHaveBeenCalledWith('task-123-reload', 0, 0);
        expect(mockFailedTaskStoreLogOnDisk).not.toHaveBeenCalled();
    });

    test('should not get the script log when nothing uses it', async () => {
        await handleFailedReloadTask(msg, taskMetadata);

        expect(mockGlobals.logger.error).not.toHaveBeenCalled();
        expect(mockGetScriptLog).not.toHaveBeenCalled();
        expect(mockFailedTaskStoreLogOnDisk).not.toHaveBeenCalled();
    });
});
