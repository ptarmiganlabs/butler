import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';

// When the Qlik Sense Cloud script-log fetch fails, the app reload handler passes scriptLog: false on to
// the email, Teams and Slack senders. Each sender should still send its alert, rendered from the
// templates that ship with Butler, and those templates should say the script log is not available
// instead of showing empty script log sections. The last tests render the same templates with a script log.

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

jest.unstable_mockModule('../api/user.js', () => ({
    getQlikSenseCloudUserInfo: jest.fn().mockResolvedValue({ id: 'owner-1', name: 'Ada Owner', email: 'ada@example.com', picture: '' }),
}));

// Capture outgoing alerts instead of sending them
const sendEmailMock = jest.fn();
jest.unstable_mockModule('../../qseow/smtp/index.js', () => ({
    sendEmail: sendEmailMock,
    isSmtpConfigOk: jest.fn().mockReturnValue(true),
}));

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

// The senders under test, keyed by alert channel
const senders = {};

beforeAll(async () => {
    senders.email = (await import('../email_notification_qscloud.js')).sendQlikSenseCloudAppReloadFailureNotificationEmail;
    senders.teams = (await import('../msteams_notification_qscloud.js')).sendQlikSenseCloudAppReloadFailureNotificationTeams;
    senders.slack = (await import('../slack_notification_qscloud.js')).sendQlikSenseCloudAppReloadFailureNotificationSlack;
});

const flushPromises = () => new Promise((r) => setImmediate(r));

// Turn on app reload failure alerts in one channel, using the template that ships with Butler
const enableAlert = (channel) => {
    const alertConfig = `Butler.qlikSenseCloud.event.mqtt.tenant.alert.${channel}Notification.reloadAppFailure`;
    cfg.set(`${alertConfig}.enable`, true);
    cfg.set(`${alertConfig}.headScriptLogLines`, 1);
    cfg.set(`${alertConfig}.tailScriptLogLines`, 1);

    if (channel === 'email') {
        cfg.set(`${alertConfig}.appOwnerAlert`, { enable: false });
        cfg.set(`${alertConfig}.alertEnableByTag.enable`, false);
        cfg.set(`${alertConfig}.recipients`, ['ops@example.com']);
        cfg.set(`${alertConfig}.bodyFileDirectory`, templateDir('email'));
        cfg.set(`${alertConfig}.htmlTemplateFile`, 'failed-reload-qscloud');
    } else {
        cfg.set(`${alertConfig}.messageType`, 'formatted');
        cfg.set(`${alertConfig}.templateFile`, path.join(templateDir(channel), 'failed-reload-qscloud.handlebars'));
        cfg.set(`${alertConfig}.webhookURL`, `https://${channel}.example.com/hook`);
    }
};

// Return the alert that was sent: the email body rendered the way smtp_core.sendEmail does, or the Teams or
// Slack message. sendTeams() only posts a formatted message that parsed as JSON, and slack_api.js parses it before posting.
const sentAlert = (channel) => {
    if (channel === 'email') {
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
        const [, recipients, , , bodyFileDirectory, htmlTemplateFile, templateContext] = sendEmailMock.mock.calls[0];
        expect(recipients).toEqual(['ops@example.com']);
        const template = fs.readFileSync(path.join(bodyFileDirectory, `${htmlTemplateFile}.handlebars`), 'utf8');
        return handlebars.compile(template)(templateContext);
    }

    if (channel === 'teams') {
        expect(teamsMessages).toHaveLength(1);
        expect(teamsMessages[0].url).toBe('https://teams.example.com/hook');
        return JSON.stringify(teamsMessages[0].msg);
    }

    expect(slackSendMock).toHaveBeenCalledTimes(1);
    const [slackMsg] = slackSendMock.mock.calls[0];
    expect(slackMsg.webhookUrl).toBe('https://slack.example.com/hook');
    return JSON.stringify(JSON.parse(slackMsg.text));
};

const reloadParams = {
    tenantId: 'tenant-1',
    tenantComment: 'Production tenant',
    tenantUrl: 'https://tenant.example.com',
    userId: 'user-1',
    ownerId: 'owner-1',
    appId: 'app-1',
    appName: 'Sales forecast',
    appUrl: 'https://tenant.example.com/sense/app/app-1',
    reloadTrigger: 'chronos',
    source: 'com.qlik/engine',
    eventType: 'com.qlik.v1.app.reload.finished',
    eventTypeVersion: '1.0.0',
    duration: '12s',
    endedWithMemoryConstraint: false,
    errors: [],
    isDirectQueryMode: false,
    isPartialReload: false,
    isSessionApp: false,
    isSkipStore: false,
    peakMemoryBytes: 1024,
    reloadId: 'reload-1',
    rowLimit: 0,
    statements: [],
    status: 'error',
    usage: {},
    warnings: [],
    sizeMemory: 2048,
    reloadInfo: {
        errorCode: 'EngineReloadScriptError',
        errorMessage: 'error in app script or datasource',
        log: 'Started loading data\nUnknown statement: ThisFailsForSure',
        status: 'FAILED',
        executionDuration: { hours: 0, minutes: 0, seconds: 12 },
        executionStartTime: { startTimeLocal1: '2026-11-03 10:00:00' },
        executionStopTime: { stopTimeLocal1: '2026-11-03 10:00:12' },
    },
    appInfo: {
        attributes: { description: 'Forecasts', hasSectionAccess: false, published: true, publishTime: '', thumbnail: '' },
    },
    appMetadata: {},
    appItems: { resourceSize: { appFile: 4096 }, meta: { tags: [] } },
    // What the app reload handler passes on when getQlikSenseCloudAppReloadScriptLog() fails
    scriptLog: false,
};

beforeEach(() => {
    cfg.clear();
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc', 'https://tenant.example.com/console');
    cfg.set('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub', 'https://tenant.example.com/hub');
    teamsMessages.length = 0;
});

describe('Qlik Sense Cloud app reload alerts when the script log could not be retrieved', () => {
    test.each(['email', 'teams', 'slack'])('the %s alert is still sent, and its template renders', async (channel) => {
        enableAlert(channel);

        await senders[channel](reloadParams);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();

        const alert = sentAlert(channel);
        expect(alert).toContain('Sales forecast');
        expect(alert).toContain('The script log is not available.');
        expect(alert).not.toContain('rows in total');
    });
});

describe('Qlik Sense Cloud app reload alerts when the script log is available', () => {
    const reloadParamsWithScriptLog = {
        ...reloadParams,
        scriptLog: {
            scriptLogFull: ['Starting reload', 'Loading Sales.qvd', 'Error: table not found'],
            scriptLogSize: 3,
        },
    };

    test.each(['email', 'teams', 'slack'])('the %s alert shows the first and last rows of the script log', async (channel) => {
        enableAlert(channel);

        await senders[channel](reloadParamsWithScriptLog);
        await flushPromises();

        expect(logger.error).not.toHaveBeenCalled();

        const alert = sentAlert(channel);
        expect(alert).toContain('The script log contains 3 rows in total, with 54 characters in them');
        expect(alert).toContain('Starting reload');
        expect(alert).toContain('Error: table not found');
        expect(alert).not.toContain('Loading Sales.qvd');
        expect(alert).not.toContain('The script log is not available.');
    });
});
