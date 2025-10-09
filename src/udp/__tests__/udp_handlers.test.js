import { jest } from '@jest/globals';

describe('udp_handlers', () => {
    let udpInitTaskErrorServer;
    let events; // event handlers registry
    let published;

    beforeAll(async () => {
        published = [];

        // Mock dependencies used within udp_handlers.js
        await jest.unstable_mockModule('../../lib/qseow/scriptlog.js', () => ({
            getScriptLog: jest.fn(async () => 'LOG'),
            failedTaskStoreLogOnDisk: jest.fn(),
            getReloadTaskExecutionResults: jest.fn(async () => ({
                executionDetailsSorted: [{ message: 'Changing task state from Started to FinishedSuccess' }],
                executionDuration: { hours: 0, minutes: 1, seconds: 2 },
            })),
        }));

        await jest.unstable_mockModule('../../qrs_util/app_metadata.js', () => ({
            default: jest.fn(async () => ({
                tags: [{ id: '1', name: 'appTag' }],
                customProperties: [{ definition: { name: 'owner' }, value: 'ops' }],
            })),
        }));
        await jest.unstable_mockModule('../../qrs_util/task_metadata.js', () => ({
            default: jest.fn(async () => ({
                tags: [{ id: '2', name: 'taskTag' }],
                customProperties: [{ definition: { name: 'team' }, value: 'eng' }],
            })),
        }));
        await jest.unstable_mockModule('../../qrs_util/does_task_exist.js', () => ({
            default: jest.fn(async (id) => ({ exists: id === 'task-1' })),
        }));
        await jest.unstable_mockModule('../../qrs_util/task_cp_util.js', () => ({
            isCustomPropertyValueSet: jest.fn(async () => true),
        }));
        await jest.unstable_mockModule('../../qrs_util/task_tag_util.js', () => ({
            default: jest.fn(async () => ['tA']),
        }));
        await jest.unstable_mockModule('../../qrs_util/app_tag_util.js', () => ({
            default: jest.fn(async () => ['aA']),
        }));
        await jest.unstable_mockModule('../../qrs_util/externalprogram_task_execution_results.js', () => ({
            default: jest.fn(async () => ({
                executionDetailsSorted: [{ message: 'Changing task state from Started to FinishedSuccess' }],
                executionDuration: { hours: 0, minutes: 1, seconds: 2 },
            })),
        }));
        await jest.unstable_mockModule('../../qrs_util/usersync_task_execution_results.js', () => ({
            default: jest.fn(async () => ({
                executionDetailsSorted: [{ message: 'Changing task state from Started to FinishedSuccess' }],
                executionDuration: { hours: 0, minutes: 1, seconds: 2 },
            })),
        }));
        await jest.unstable_mockModule('../../lib/incident_mgmt/signl4.js', () => ({
            sendReloadTaskFailureNotification: jest.fn(),
            sendReloadTaskAbortedNotification: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/incident_mgmt/new_relic.js', () => ({
            sendReloadTaskFailureLog: jest.fn(),
            sendReloadTaskFailureEvent: jest.fn(),
            sendReloadTaskAbortedLog: jest.fn(),
            sendReloadTaskAbortedEvent: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/smtp.js', () => ({
            sendReloadTaskFailureNotificationEmail: jest.fn(),
            sendReloadTaskAbortedNotificationEmail: jest.fn(),
            sendReloadTaskSuccessNotificationEmail: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/slack_notification.js', () => ({
            sendReloadTaskFailureNotificationSlack: jest.fn(),
            sendReloadTaskAbortedNotificationSlack: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/msteams_notification.js', () => ({
            sendReloadTaskFailureNotificationTeams: jest.fn(),
            sendReloadTaskAbortedNotificationTeams: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/webhook_notification.js', () => ({
            sendReloadTaskFailureNotificationWebhook: jest.fn(),
            sendReloadTaskAbortedNotificationWebhook: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/post_to_influxdb.js', () => ({
            postReloadTaskFailureNotificationInfluxDb: jest.fn(),
            postReloadTaskSuccessNotificationInfluxDb: jest.fn(),
            postUserSyncTaskSuccessNotificationInfluxDb: jest.fn(),
            postExternalProgramTaskSuccessNotificationInfluxDb: jest.fn(),
        }));

        events = {};
        const mockGlobals = {
            config: {
                has: jest.fn(() => true),
                get: jest.fn((k) => {
                    const map = {
                        'Butler.incidentTool.newRelic.enable': true,
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.event.enable': true,
                        'Butler.incidentTool.newRelic.reloadTaskAborted.destination.log.enable': true,
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.event.enable': true,
                        'Butler.incidentTool.newRelic.reloadTaskFailure.destination.log.enable': true,
                        'Butler.incidentTool.signl4.enable': true,
                        'Butler.incidentTool.signl4.reloadTaskAborted.enable': true,
                        'Butler.incidentTool.signl4.reloadTaskFailure.enable': true,
                        'Butler.slackNotification.enable': true,
                        'Butler.slackNotification.reloadTaskAborted.enable': true,
                        'Butler.slackNotification.reloadTaskFailure.enable': true,
                        'Butler.teamsNotification.enable': true,
                        'Butler.teamsNotification.reloadTaskAborted.enable': true,
                        'Butler.teamsNotification.reloadTaskFailure.enable': true,
                        'Butler.emailNotification.enable': true,
                        'Butler.emailNotification.reloadTaskAborted.enable': true,
                        'Butler.emailNotification.reloadTaskFailure.enable': true,
                        'Butler.webhookNotification.enable': true,
                        'Butler.influxDb.enable': true,
                        'Butler.influxDb.reloadTaskFailure.enable': true,
                        'Butler.influxDb.reloadTaskSuccess.enable': true,
                        'Butler.influxDb.reloadTaskSuccess.allReloadTasks.enable': true,
                        'Butler.mqttConfig.enable': true,
                        'Butler.mqttConfig.taskFailureTopic': 'failureTopic',
                        'Butler.mqttConfig.taskAbortedTopic': 'abortedTopic',
                        'Butler.mqttConfig.taskFailureServerStatusTopic': 'statusTopic',
                        'Butler.mqttConfig.taskFailureFullTopic': 'failFull',
                        'Butler.mqttConfig.taskAbortedFullTopic': 'abortFull',
                        'Butler.mqttConfig.taskFailureSendFull': true,
                        'Butler.mqttConfig.taskAbortedSendFull': true,
                    };
                    return map[k];
                }),
            },
            logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), verbose: jest.fn(), warn: jest.fn() },
            getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
            udpServerTaskResultSocket: {
                on: jest.fn((evt, handler) => {
                    events[evt] = handler;
                }),
                address: jest.fn(() => ({ address: '127.0.0.1', port: 9999 })),
            },
            mqttClient: {
                connected: true,
                publish: jest.fn((topic, msg) => published.push({ topic, msg })),
            },
            sleep: jest.fn(() => Promise.resolve()),
        };
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));

        udpInitTaskErrorServer = (await import('../udp_handlers.js')).default;
    });

    beforeEach(() => {
        events = {};
        published.length = 0;
        udpInitTaskErrorServer();
    });

    // Helper to wait until a condition is true or timeout
    const waitFor = async (predicate, timeout = 500, interval = 10) => {
        const start = Date.now();
        while (Date.now() - start < timeout) {
            if (predicate()) return true;
            await new Promise((r) => setTimeout(r, interval));
        }
        return false;
    };

    test('listening and error events publish MQTT status', async () => {
        // listening
        events.listening(Buffer.from(''), {});
        const { default: globals } = await import('../../globals.js');
        expect(globals.mqttClient.publish).toHaveBeenCalledWith('statusTopic', 'start');

        // error
        events.error(Buffer.from(''), {});
        expect(globals.mqttClient.publish).toHaveBeenCalledWith('statusTopic', 'error');
    });

    test('engine reload failed with wrong length is warned and ignored', async () => {
        const { default: globals } = await import('../../globals.js');
        events.message(Buffer.from('/engine-reload-failed/;a;b;c;d;e;f;g'), {}); // only 8 fields
        expect(globals.logger.warn).toHaveBeenCalled();
    });

    test('scheduler reload failed path triggers notifications and MQTT', async () => {
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;task-1;app-1;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        const { default: globals } = await import('../../globals.js');
        expect(globals.mqttClient.publish).toHaveBeenCalledWith('failureTopic', 'Task');
        // full payload publish
        expect(published.some((p) => p.topic === 'failFull')).toBe(true);
    });

    test('scheduler reload aborted publishes MQTT and full payload', async () => {
        const msg = '/scheduler-reload-aborted/;host;Task;App;dir/user;task-1;app-1;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'abortedTopic'));
        await waitFor(() => published.some((p) => p.topic === 'abortFull'));
        const { default: globals } = await import('../../globals.js');
        expect(globals.mqttClient.publish).toHaveBeenCalledWith('abortedTopic', 'Task');
        expect(published.some((p) => p.topic === 'abortFull')).toBe(true);
    });

    test('unknown message type logs warning', async () => {
        const { default: globals } = await import('../../globals.js');
        events.message(Buffer.from('/unknown-type/;a;b;c'), {});
        expect(globals.logger.warn).toHaveBeenCalledWith('[QSEOW] UDP HANDLER: Unknown UDP message type: "/unknown-type/"');
    });

    test('scheduler success: early return when app metadata retrieval fails (no influx write)', async () => {
        const appMetadataMod = await import('../../qrs_util/app_metadata.js');
        appMetadataMod.default.mockResolvedValueOnce(false);
        const influxMod = await import('../../lib/post_to_influxdb.js');
        const callsBefore = influxMod.postReloadTaskSuccessNotificationInfluxDb.mock.calls.length;

        const msg = '/scheduler-reloadtask-success/;host;Task;App;dir/user;task-1;app-1;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), {});
        await new Promise((r) => setTimeout(r, 50));
        const callsAfter = influxMod.postReloadTaskSuccessNotificationInfluxDb.mock.calls.length;
        // When appMetadata fails, handler returns early and influxDb is not written
        expect(callsAfter).toBe(callsBefore);
    });

    // Tests for handling edge cases have been removed or consolidated as the codebase
    // now properly routes different task types to their own handlers.
    // External program tasks don't have appIds, so those specific error paths don't apply.

    test('scheduler failed: MQTT disconnected warns and does not basic-publish', async () => {
        const { default: globals } = await import('../../globals.js');
        globals.mqttClient.connected = false;
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;task-1;app-1;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        expect(published.some((p) => p.topic === 'failureTopic')).toBe(false);
        // Full payload still gets published even if disconnected
        expect(published.some((p) => p.topic === 'failFull')).toBe(true);
        globals.mqttClient.connected = true;
    });

    test('scheduler aborted: MQTT disconnected warns and does not basic-publish', async () => {
        const { default: globals } = await import('../../globals.js');
        globals.mqttClient.connected = false;
        const msg = '/scheduler-reload-aborted/;host;Task;App;dir/user;task-1;app-1;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'abortFull'));
        expect(published.some((p) => p.topic === 'abortedTopic')).toBe(false);
        // Full payload still gets published even if disconnected
        expect(published.some((p) => p.topic === 'abortFull')).toBe(true);
        globals.mqttClient.connected = true;
    });

    test('scheduler failed: Slack notification gating is honored (enabled vs disabled)', async () => {
        const slack = await import('../../lib/qseow/slack_notification.js');
        const { default: globals } = await import('../../globals.js');
        // Enabled by default in test globals
        const callsBefore = slack.sendReloadTaskFailureNotificationSlack.mock.calls.length;
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;task-1;app-1;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        const callsAfter = slack.sendReloadTaskFailureNotificationSlack.mock.calls.length;
        expect(callsAfter).toBeGreaterThan(callsBefore);

        // Disable Slack globally and specific failure toggle
        const originalGet = globals.config.get;
        globals.config.get = jest.fn((k) => {
            if (k === 'Butler.slackNotification.enable') return false;
            if (k === 'Butler.slackNotification.reloadTaskFailure.enable') return false;
            return originalGet(k);
        });
        const callsBeforeDisabled = slack.sendReloadTaskFailureNotificationSlack.mock.calls.length;
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        const callsAfterDisabled = slack.sendReloadTaskFailureNotificationSlack.mock.calls.length;
        expect(callsAfterDisabled).toBe(callsBeforeDisabled);
        // Restore
        globals.config.get = originalGet;
    });

    test('scheduler failed: Teams notification gating is honored (enabled vs disabled)', async () => {
        const teams = await import('../../lib/qseow/msteams_notification.js');
        const { default: globals } = await import('../../globals.js');
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;task-1;app-1;ts;INFO;exec;Message';

        const before = teams.sendReloadTaskFailureNotificationTeams.mock.calls.length;
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        const after = teams.sendReloadTaskFailureNotificationTeams.mock.calls.length;
        expect(after).toBeGreaterThan(before);

        const originalGet = globals.config.get;
        globals.config.get = jest.fn((k) => {
            if (k === 'Butler.teamsNotification.enable') return false;
            if (k === 'Butler.teamsNotification.reloadTaskFailure.enable') return false;
            return originalGet(k);
        });
        const beforeDisabled = teams.sendReloadTaskFailureNotificationTeams.mock.calls.length;
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        const afterDisabled = teams.sendReloadTaskFailureNotificationTeams.mock.calls.length;
        expect(afterDisabled).toBe(beforeDisabled);
        globals.config.get = originalGet;
    });

    test('scheduler failed: Signl4 gating is honored (enabled vs disabled)', async () => {
        const signl4 = await import('../../lib/incident_mgmt/signl4.js');
        const { default: globals } = await import('../../globals.js');
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;task-1;app-1;ts;INFO;exec;Message';

        const before = signl4.sendReloadTaskFailureNotification.mock.calls.length;
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        const after = signl4.sendReloadTaskFailureNotification.mock.calls.length;
        expect(after).toBeGreaterThan(before);

        const originalGet = globals.config.get;
        globals.config.get = jest.fn((k) => {
            if (k === 'Butler.incidentTool.signl4.enable') return false;
            if (k === 'Butler.incidentTool.signl4.reloadTaskFailure.enable') return false;
            return originalGet(k);
        });
        const beforeDisabled = signl4.sendReloadTaskFailureNotification.mock.calls.length;
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        const afterDisabled = signl4.sendReloadTaskFailureNotification.mock.calls.length;
        expect(afterDisabled).toBe(beforeDisabled);
        globals.config.get = originalGet;
    });
});
