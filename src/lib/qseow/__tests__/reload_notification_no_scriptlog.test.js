import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';

// When the QRS script-log fetch fails, the reload task handlers pass scriptLog: null on to the
// email, Teams and Slack senders. Each sender should still send its alert, without script log
// details, rendered from the templates that ship with Butler.

const templateDir = (channel) => fileURLToPath(new URL(`../../../config/${channel}_templates`, import.meta.url));

// Minimal globals with config and logger
const logger = { info: jest.fn(), verbose: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
const cfg = new Map();
jest.unstable_mockModule('../../../globals.js', () => ({
    default: {
        logger,
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
        config: {
            has: (k) => cfg.has(k),
            get: (k) => cfg.get(k),
        },
    },
}));

// Let every alert through the rate limiters
jest.unstable_mockModule('rate-limiter-flexible', () => ({
    RateLimiterMemory: jest.fn().mockImplementation(() => ({
        consume: jest.fn().mockResolvedValue({ remainingPoints: 0, msBeforeNext: 0 }),
    })),
}));

jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({
    default: jest.fn().mockResolvedValue({ userName: 'owner', directory: 'DIR', userId: 'uid', emails: ['owner@example.com'] }),
}));

jest.unstable_mockModule('../../../qrs_util/task_cp_util.js', () => ({
    getTaskCustomPropertyValues: jest.fn().mockResolvedValue([]),
    isCustomPropertyValueSet: jest.fn().mockResolvedValue(false),
}));

jest.unstable_mockModule('../get_qs_urls.js', () => ({
    getQlikSenseUrls: jest.fn().mockReturnValue({
        appBaseUrl: 'https://sense/apps',
        qmcUrl: 'https://sense/qmc',
        hubUrl: 'https://sense/hub',
    }),
}));

// Capture outgoing alerts instead of sending them
const sendEmailMock = jest.fn();
jest.unstable_mockModule('../../smtp_core.js', () => ({ sendEmail: sendEmailMock }));

const teamsMessages = [];
jest.unstable_mockModule('ms-teams-wrapper', () => ({
    Webhook: jest.fn().mockImplementation((url, msg) => {
        teamsMessages.push({ url, msg });
        return { sendMessage: jest.fn().mockResolvedValue({ status: 200, statusText: 'OK', data: 'ok' }) };
    }),
    SimpleTextCard: jest.fn(),
}));

const slackSendMock = jest.fn().mockResolvedValue(undefined);
jest.unstable_mockModule('../../slack_api.js', () => ({ default: slackSendMock }));

// The senders under test, keyed by function name
const senders = {};

beforeAll(async () => {
    Object.assign(
        senders,
        await import('../smtp/reload-task-failed.js'),
        await import('../smtp/reload-task-aborted.js'),
        await import('../smtp/reload-task-success.js'),
        await import('../msteams_notification.js'),
        await import('../slack_notification.js'),
    );
});

const flushPromises = () => new Promise((r) => setImmediate(r));

const reloadParams = {
    hostName: 'sense1',
    user: 'DIR/user',
    taskName: 'Reload of Sales app',
    taskId: 'tid-1',
    appName: 'Sales',
    appId: 'aid-1',
    logTimeStamp: '2026-11-02 10:00:00,000',
    logLevel: 'ERROR',
    executionId: 'eid-1',
    logMessage: 'Reload failed',
    qs_appTags: [],
    qs_appCustomProperties: [],
    qs_taskTags: [],
    qs_taskCustomProperties: [],
    qs_appMetadata: {},
    qs_taskMetadata: {
        isManuallyTriggered: false,
        isPartialReload: false,
        maxRetries: 0,
        modifiedByUserName: 'DIR/admin',
        modifiedDate: '2026-11-01T10:00:00.000Z',
        taskSessionTimeout: 1440,
        operational: { nextExecution: '1753-01-01T00:00:00.000Z' },
    },
    // What the reload task handlers pass on when getScriptLog() fails
    scriptLog: null,
};

beforeEach(() => {
    cfg.clear();
    teamsMessages.length = 0;
});

describe('reload notifications when the script log could not be retrieved', () => {
    test.each([
        ['sendReloadTaskFailureNotificationEmail', 'reloadTaskFailure', 'failed-reload-qseow'],
        ['sendReloadTaskAbortedNotificationEmail', 'reloadTaskAborted', 'aborted-reload-qseow'],
        ['sendReloadTaskSuccessNotificationEmail', 'reloadTaskSuccess', 'success-reload-qseow'],
    ])('%s still sends the email, and its template renders', async (sender, alertType, templateFile) => {
        cfg.set('Butler.emailNotification.enable', true);
        cfg.set(`Butler.emailNotification.${alertType}.enable`, true);
        cfg.set(`Butler.emailNotification.${alertType}.alertEnableByCustomProperty.enable`, false);
        cfg.set(`Butler.emailNotification.${alertType}.recipients`, ['ops@example.com']);
        cfg.set(`Butler.emailNotification.${alertType}.bodyFileDirectory`, templateDir('email'));
        cfg.set(`Butler.emailNotification.${alertType}.htmlTemplateFile`, templateFile);

        await senders[sender](reloadParams);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Script log data is not available'));
        expect(sendEmailMock).toHaveBeenCalledTimes(1);

        const [, recipients, , , bodyFileDirectory, htmlTemplateFile, templateContext] = sendEmailMock.mock.calls[0];
        expect(recipients).toEqual(['ops@example.com']);

        // Render the email body the way smtp_core.sendEmail does
        const template = fs.readFileSync(path.join(bodyFileDirectory, `${htmlTemplateFile}.handlebars`), 'utf8');
        expect(handlebars.compile(template)(templateContext)).toContain('Reload of Sales app');
    });

    test.each([
        ['sendReloadTaskFailureNotificationTeams', 'reloadTaskFailure', 'failed-reload-qseow'],
        ['sendReloadTaskAbortedNotificationTeams', 'reloadTaskAborted', 'aborted-reload-qseow'],
    ])('%s still posts the Teams message, and its template renders', async (sender, alertType, templateFile) => {
        cfg.set(`Butler.teamsNotification.${alertType}.enable`, true);
        cfg.set(`Butler.teamsNotification.${alertType}.messageType`, 'formatted');
        cfg.set(`Butler.teamsNotification.${alertType}.templateFile`, path.join(templateDir('teams'), `${templateFile}.handlebars`));
        cfg.set(`Butler.teamsNotification.${alertType}.webhookURL`, 'https://teams.example.com/hook');

        senders[sender](reloadParams);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Script log data is not available'));

        // sendTeams() only posts the message if the rendered template parsed as JSON
        expect(teamsMessages).toHaveLength(1);
        expect(teamsMessages[0].url).toBe('https://teams.example.com/hook');
        expect(JSON.stringify(teamsMessages[0].msg)).toContain('Reload of Sales app');
    });

    test.each([
        ['sendReloadTaskFailureNotificationSlack', 'reloadTaskFailure', 'failed-reload-qseow'],
        ['sendReloadTaskAbortedNotificationSlack', 'reloadTaskAborted', 'aborted-reload-qseow'],
    ])('%s still posts the Slack message, and its template renders', async (sender, alertType, templateFile) => {
        cfg.set(`Butler.slackNotification.${alertType}.enable`, true);
        cfg.set(`Butler.slackNotification.${alertType}.messageType`, 'formatted');
        cfg.set(`Butler.slackNotification.${alertType}.templateFile`, path.join(templateDir('slack'), `${templateFile}.handlebars`));
        cfg.set(`Butler.slackNotification.${alertType}.webhookURL`, 'https://slack.example.com/hook');

        senders[sender](reloadParams);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Script log data is not available'));
        expect(slackSendMock).toHaveBeenCalledTimes(1);

        // slack_api.js parses formatted messages as JSON before posting them
        const [slackMsg] = slackSendMock.mock.calls[0];
        expect(slackMsg.webhookUrl).toBe('https://slack.example.com/hook');
        expect(JSON.stringify(JSON.parse(slackMsg.text))).toContain('Reload of Sales app');
    });
});
