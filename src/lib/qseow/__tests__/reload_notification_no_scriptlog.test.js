import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';

// When the QRS script-log fetch fails, the reload task handlers pass scriptLog: null on to the
// email, Teams and Slack senders. Each sender should still send its alert, rendered from the
// templates that ship with Butler, and those templates should say the script log is not available
// instead of showing empty script log sections. In the same QRS outage the app owner can't be read
// either, and getAppOwner() returns false. The last tests render the same templates with a script log.

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

const getAppOwnerMock = jest.fn().mockResolvedValue({ userName: 'owner', directory: 'DIR', userId: 'uid', emails: ['owner@example.com'] });
jest.unstable_mockModule('../../../qrs_util/get_app_owner.js', () => ({ default: getAppOwnerMock }));

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

// Turn on one type of reload alert email, sent to ops@example.com for every task
const enableEmailAlert = (alertType, templateFile) => {
    cfg.set('Butler.emailNotification.enable', true);
    cfg.set(`Butler.emailNotification.${alertType}.enable`, true);
    cfg.set(`Butler.emailNotification.${alertType}.alertEnableByCustomProperty.enable`, false);
    cfg.set(`Butler.emailNotification.${alertType}.recipients`, ['ops@example.com']);
    cfg.set(`Butler.emailNotification.${alertType}.bodyFileDirectory`, templateDir('email'));
    cfg.set(`Butler.emailNotification.${alertType}.htmlTemplateFile`, templateFile);
};

// Turn on one type of formatted reload alert in Teams or Slack
const enableChatAlert = (channel, alertType, templateFile) => {
    cfg.set(`Butler.${channel}Notification.${alertType}.enable`, true);
    cfg.set(`Butler.${channel}Notification.${alertType}.messageType`, 'formatted');
    cfg.set(`Butler.${channel}Notification.${alertType}.templateFile`, path.join(templateDir(channel), `${templateFile}.handlebars`));
    cfg.set(`Butler.${channel}Notification.${alertType}.webhookURL`, `https://${channel}.example.com/hook`);
};

// Render the body of the first email sent, the way smtp_core.sendEmail does
const renderEmail = () => {
    const [, , , , bodyFileDirectory, htmlTemplateFile, templateContext] = sendEmailMock.mock.calls[0];
    const template = fs.readFileSync(path.join(bodyFileDirectory, `${htmlTemplateFile}.handlebars`), 'utf8');
    return handlebars.compile(template)(templateContext);
};

// sendTeams() only posts a formatted message that parsed as JSON, and slack_api.js parses it before posting
const postedTeamsMessage = () => {
    expect(teamsMessages).toHaveLength(1);
    expect(teamsMessages[0].url).toBe('https://teams.example.com/hook');
    return JSON.stringify(teamsMessages[0].msg);
};
const postedSlackMessage = () => {
    expect(slackSendMock).toHaveBeenCalledTimes(1);
    const [slackMsg] = slackSendMock.mock.calls[0];
    expect(slackMsg.webhookUrl).toBe('https://slack.example.com/hook');
    return JSON.stringify(JSON.parse(slackMsg.text));
};

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
        enableEmailAlert(alertType, templateFile);

        await senders[sender](reloadParams);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Script log data is not available'));
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
        expect(sendEmailMock.mock.calls[0][1]).toEqual(['ops@example.com']);

        const body = renderEmail();
        expect(body).toContain('Reload of Sales app');
        expect(body).toContain('The script log is not available.');
        expect(body).not.toContain('rows in total');
    });

    test.each([
        ['sendReloadTaskFailureNotificationEmail', 'reloadTaskFailure', 'failed-reload-qseow'],
        ['sendReloadTaskAbortedNotificationEmail', 'reloadTaskAborted', 'aborted-reload-qseow'],
    ])('%s still sends the email when the app owner cannot be read either', async (sender, alertType, templateFile) => {
        enableEmailAlert(alertType, templateFile);
        cfg.set(`Butler.emailNotification.${alertType}.appOwnerAlert.enable`, true);
        cfg.set(`Butler.emailNotification.${alertType}.appOwnerAlert.includeOwner.includeAll`, true);
        getAppOwnerMock.mockResolvedValueOnce(false);

        await senders[sender](reloadParams);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();
        expect(sendEmailMock).toHaveBeenCalledTimes(1);

        // Sent to the configured recipients only, as there is no app owner to add
        expect(sendEmailMock.mock.calls[0][1]).toEqual(['ops@example.com']);
    });

    // Only the failed-reload Teams and Slack templates have a script log section
    test.each([
        ['sendReloadTaskFailureNotificationTeams', 'teams', 'reloadTaskFailure', 'failed-reload-qseow', true],
        ['sendReloadTaskAbortedNotificationTeams', 'teams', 'reloadTaskAborted', 'aborted-reload-qseow', false],
        ['sendReloadTaskFailureNotificationSlack', 'slack', 'reloadTaskFailure', 'failed-reload-qseow', true],
        ['sendReloadTaskAbortedNotificationSlack', 'slack', 'reloadTaskAborted', 'aborted-reload-qseow', false],
    ])('%s still posts the message, and its template renders', async (sender, channel, alertType, templateFile, hasScriptLogSection) => {
        enableChatAlert(channel, alertType, templateFile);

        senders[sender](reloadParams);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Script log data is not available'));

        const message = channel === 'teams' ? postedTeamsMessage() : postedSlackMessage();
        expect(message).toContain('Reload of Sales app');
        expect(message).toContain(reloadParams.taskId);
        expect(message).not.toContain('rows in total');
        expect(message.includes('The script log is not available.')).toBe(hasScriptLogSection);
    });
});

describe('reload notifications when the script log is available', () => {
    const reloadParamsWithScriptLog = {
        ...reloadParams,
        scriptLog: {
            executingNodeName: 'node1',
            executionDetailsConcatenated: '',
            scriptLogFull: ['Starting reload', 'Loading Sales.qvd', 'Error: table not found'],
            scriptLogSizeRows: 3,
            scriptLogSizeCharacters: 52,
        },
    };

    test.each([
        ['sendReloadTaskFailureNotificationEmail', 'reloadTaskFailure', 'failed-reload-qseow'],
        ['sendReloadTaskAbortedNotificationEmail', 'reloadTaskAborted', 'aborted-reload-qseow'],
        ['sendReloadTaskSuccessNotificationEmail', 'reloadTaskSuccess', 'success-reload-qseow'],
    ])('%s shows the first and last rows of the script log', async (sender, alertType, templateFile) => {
        enableEmailAlert(alertType, templateFile);
        cfg.set(`Butler.emailNotification.${alertType}.headScriptLogLines`, 1);
        cfg.set(`Butler.emailNotification.${alertType}.tailScriptLogLines`, 1);

        await senders[sender](reloadParamsWithScriptLog);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();

        const body = renderEmail();
        expect(body).toContain('The script log contains 3 rows in total');
        expect(body).toContain('<pre>Starting reload</pre>');
        expect(body).toContain('<pre>Error: table not found</pre>');
        expect(body).not.toContain('The script log is not available.');
    });

    test.each([
        ['sendReloadTaskFailureNotificationTeams', 'teams'],
        ['sendReloadTaskFailureNotificationSlack', 'slack'],
    ])('%s shows the first and last rows of the script log', async (sender, channel) => {
        enableChatAlert(channel, 'reloadTaskFailure', 'failed-reload-qseow');
        cfg.set(`Butler.${channel}Notification.reloadTaskFailure.headScriptLogLines`, 1);
        cfg.set(`Butler.${channel}Notification.reloadTaskFailure.tailScriptLogLines`, 1);

        senders[sender](reloadParamsWithScriptLog);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();

        const message = channel === 'teams' ? postedTeamsMessage() : postedSlackMessage();
        expect(message).toContain('The script log contains 3 rows in total');
        expect(message).toContain('Starting reload');
        expect(message).toContain('Error: table not found');
        expect(message).not.toContain('Loading Sales.qvd');
        expect(message).not.toContain('The script log is not available.');
    });
});
