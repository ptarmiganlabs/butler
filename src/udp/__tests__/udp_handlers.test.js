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
            default: jest.fn(async (id) => {
                const validGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                return { exists: validGuid.test(id) };
            }),
        }));
        await jest.unstable_mockModule('../../qrs_util/task_cp_util.js', () => ({
            isCustomPropertyValueSet: jest.fn(async () => true),
            getTaskCustomPropertyValues: jest.fn(async () => []),
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
        await jest.unstable_mockModule('../../qrs_util/distribute_task_execution_results.js', () => ({
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
        await jest.unstable_mockModule('../../lib/qseow/smtp/reload-task-success.js', () => ({
            sendReloadTaskSuccessNotificationEmail: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/smtp/reload-task-failed.js', () => ({
            sendReloadTaskFailureNotificationEmail: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/smtp/reload-task-aborted.js', () => ({
            sendReloadTaskAbortedNotificationEmail: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/smtp/distribute-task-success.js', () => ({
            sendDistributeTaskSuccessNotificationEmail: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/smtp/distribute-task-failed.js', () => ({
            sendDistributeTaskFailureNotificationEmail: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/smtp/preload-task-success.js', () => ({
            sendPreloadTaskSuccessNotificationEmail: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/smtp/preload-task-failed.js', () => ({
            sendPreloadTaskFailureNotificationEmail: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/qseow/smtp/index.js', () => ({
            isSmtpConfigOk: jest.fn(() => true),
            sendEmail: jest.fn(),
            sendEmailBasic: jest.fn(),
            sendReloadTaskFailureNotificationEmail: jest.fn(),
            sendReloadTaskAbortedNotificationEmail: jest.fn(),
            sendDistributeTaskFailureNotificationEmail: jest.fn(),
            sendDistributeTaskSuccessNotificationEmail: jest.fn(),
            sendReloadTaskSuccessNotificationEmail: jest.fn(),
            sendPreloadTaskSuccessNotificationEmail: jest.fn(),
            sendPreloadTaskFailureNotificationEmail: jest.fn(),
            sendServiceMonitorNotificationEmail: jest.fn(),
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
        await jest.unstable_mockModule('../../lib/influxdb/task_success.js', () => ({
            postReloadTaskSuccessNotificationInfluxDb: jest.fn(),
            postUserSyncTaskSuccessNotificationInfluxDb: jest.fn(),
            postExternalProgramTaskSuccessNotificationInfluxDb: jest.fn(),
            postDistributeTaskSuccessNotificationInfluxDb: jest.fn(),
            postPreloadTaskSuccessNotificationInfluxDb: jest.fn(),
        }));
        await jest.unstable_mockModule('../../lib/influxdb/task_failure.js', () => ({
            postReloadTaskFailureNotificationInfluxDb: jest.fn(),
            postExternalProgramTaskFailureNotificationInfluxDb: jest.fn(),
            postDistributeTaskFailureNotificationInfluxDb: jest.fn(),
            postPreloadTaskFailureNotificationInfluxDb: jest.fn(),
            postUserSyncTaskFailureNotificationInfluxDb: jest.fn(),
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
                        'Butler.influxDb.externalProgramTaskFailure.enable': true,
                        'Butler.mqttConfig.enable': true,
                        'Butler.mqttConfig.taskFailureTopic': 'failureTopic',
                        'Butler.mqttConfig.taskAbortedTopic': 'abortedTopic',
                        'Butler.mqttConfig.taskFailureServerStatusTopic': 'statusTopic',
                        'Butler.mqttConfig.taskFailureFullTopic': 'failFull',
                        'Butler.mqttConfig.taskAbortedFullTopic': 'abortFull',
                        'Butler.mqttConfig.taskFailureSendFull': true,
                        'Butler.mqttConfig.taskAbortedSendFull': true,
                        'Butler.udpServerConfig.messageQueue.enable': true,
                        'Butler.udpServerConfig.messageQueue.maxConcurrent': 5,
                        'Butler.udpServerConfig.messageQueue.maxSize': 1000,
                        'Butler.udpServerConfig.messageQueue.backpressureThreshold': 0.8,
                        'Butler.udpServerConfig.rateLimit.enable': false,
                        'Butler.udpServerConfig.rateLimit.maxMessagesPerMinute': 1000,
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
            udpMaxMessageSize: 65507,
            udpEnableSourceValidation: false,
            udpAllowedSourcesConfig: [],
            udpAllowedIPs: [],
            udpQueueManager: null,
            mqttClient: {
                connected: true,
                publish: jest.fn((topic, msg) => published.push({ topic, msg })),
            },
            sleep: jest.fn(() => Promise.resolve()),
        };
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));

        udpInitTaskErrorServer = (await import('../udp_handlers.js')).default;
    });

    beforeEach(async () => {
        events = {};
        published.length = 0;
        await udpInitTaskErrorServer();
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
        await events.message(Buffer.from('/engine-reload-failed/;a;b;c;d;e;f;g'), {}); // only 8 fields
        await new Promise((r) => setTimeout(r, 50));
        expect(globals.logger.warn).toHaveBeenCalled();
    });

    test('engine reload failed does not apply scheduler task/app GUID validation indexes', async () => {
        const { default: globals } = await import('../../globals.js');
        const msg =
            '/engine-reload-failed/;host;550e8400-e29b-41d4-a716-446655440001;appName;userDir;active-user-id;2026-01-01T10:20:30Z;exec123;reload failed';
        await events.message(Buffer.from(msg), {});
        await new Promise((r) => setTimeout(r, 50));
        const invalidTaskIdWarnings = globals.logger.warn.mock.calls.filter(
            (call) => typeof call[0] === 'string' && call[0].includes('Invalid Task ID format'),
        );
        expect(invalidTaskIdWarnings).toHaveLength(0);
    });

    test('logs sanitized UDP message content', async () => {
        const { default: globals } = await import('../../globals.js');
        const msg = '/unknown-type/;field1;line1\nline2';
        await events.message(Buffer.from(msg), {});
        await new Promise((r) => setTimeout(r, 100));
        const udpReceivedLog = globals.logger.verbose.mock.calls.find(
            (call) => typeof call[0] === 'string' && call[0].startsWith('[QSEOW] UDP HANDLER: UDP message received:'),
        );
        expect(udpReceivedLog).toBeTruthy();
        expect(udpReceivedLog[0]).not.toContain('\n');
    });

    test('scheduler reload failed path triggers notifications and MQTT', async () => {
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        const { default: globals } = await import('../../globals.js');
        expect(globals.mqttClient.publish).toHaveBeenCalledWith('failureTopic', 'Task');
        // full payload publish
        expect(published.some((p) => p.topic === 'failFull')).toBe(true);
    });

    test('scheduler reload aborted publishes MQTT and full payload', async () => {
        const msg = '/scheduler-reload-aborted/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'abortFull'));
        await waitFor(() => published.some((p) => p.topic === 'abortFull'));
        const { default: globals } = await import('../../globals.js');
        expect(globals.mqttClient.publish).toHaveBeenCalledWith('abortedTopic', 'Task');
        expect(published.some((p) => p.topic === 'abortFull')).toBe(true);
    });

    test('unknown message type logs warning', async () => {
        const { default: globals } = await import('../../globals.js');
        events.message(Buffer.from('/unknown-type/;a;b;c'), {});
        // Wait for queue to process
        await new Promise((r) => setTimeout(r, 100));
        expect(globals.logger.warn).toHaveBeenCalledWith('[QSEOW] UDP HANDLER: Unknown UDP message type: "/unknown-type/"');
    });

    test('scheduler success: early return when app metadata retrieval fails (no influx write)', async () => {
        const appMetadataMod = await import('../../qrs_util/app_metadata.js');
        appMetadataMod.default.mockResolvedValueOnce(false);
        const influxMod = await import('../../lib/influxdb/task_success.js');
        const callsBefore = influxMod.postReloadTaskSuccessNotificationInfluxDb.mock.calls.length;

        const msg = '/scheduler-reloadtask-success/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';
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
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';
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
        const msg = '/scheduler-reload-aborted/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';
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
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';
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
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';

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
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';

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

    test('oversized UDP message is rejected and warned', async () => {
        const { default: globals } = await import('../../globals.js');
        // Create a buffer exceeding the max message size
        const oversized = Buffer.alloc(globals.udpMaxMessageSize + 1, 'a');
        events.message(oversized, {});
        // Wait a bit for the synchronous size check to log
        await new Promise((r) => setTimeout(r, 50));
        expect(globals.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Message size'),
        );
    });

    test('UDP message from allowed IP is processed', async () => {
        const { default: globals } = await import('../../globals.js');
        globals.udpEnableSourceValidation = true;
        globals.udpAllowedIPs = ['192.168.1.100', '10.0.0.1'];

        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), { address: '192.168.1.100' });
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        expect(published.some((p) => p.topic === 'failureTopic')).toBe(true);
    });

    test('UDP message from disallowed IP is rejected', async () => {
        const { default: globals } = await import('../../globals.js');
        globals.udpEnableSourceValidation = true;
        globals.udpAllowedIPs = ['192.168.1.100'];

        events.message(Buffer.from('/scheduler-reload-failed/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message'), {
            address: '10.0.0.1',
        });
        expect(globals.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('unauthorized source'),
        );
    });

    test('Source validation skipped when disabled', async () => {
        const { default: globals } = await import('../../globals.js');
        globals.udpEnableSourceValidation = false;

        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), { address: '1.2.3.4' });
        await waitFor(() => published.some((p) => p.topic === 'failFull'));
        expect(published.some((p) => p.topic === 'failureTopic')).toBe(true);
    });

    // --- Input sanitization tests ---

    test('control characters are removed from message fields', async () => {
        const { default: globals } = await import('../../globals.js');
        const msgWithControlChars = '/scheduler-reload-failed/;host\t;Task\n;App\r;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message\x01\x02';
        await events.message(Buffer.from(msgWithControlChars), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));

        // Verify warning was logged about sanitization
        expect(globals.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Message sanitized'),
        );
    });

    test('fields exceeding 500 characters are truncated', async () => {
        const { default: globals } = await import('../../globals.js');
        const longField = 'A'.repeat(600);
        const msg = `/scheduler-reload-failed/;host;${longField};App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message`;
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));

        // Verify warning was logged about sanitization
        expect(globals.logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('Message sanitized'),
        );
    });

    test('normal messages pass through without sanitization warning', async () => {
        const { default: globals } = await import('../../globals.js');
        globals.logger.warn.mockClear();
        const msg = '/scheduler-reload-failed/;host;Task;App;dir/user;550e8400-e29b-41d4-a716-446655440000;550e8400-e29b-41d4-a716-446655440001;ts;INFO;exec;Message';
        await events.message(Buffer.from(msg), {});
        await waitFor(() => published.some((p) => p.topic === 'failFull'));

        // Verify NO sanitization warning was logged
        expect(globals.logger.warn).not.toHaveBeenCalledWith(
            expect.stringContaining('Message sanitized'),
        );
    });

    test('sanitizeField utility function works correctly', async () => {
        const { sanitizeField, sanitizeMessage } = await import('../../lib/udp_sanitizer.js');

        // Test control character removal
        expect(sanitizeField('hello\x01world')).toBe('helloworld');
        expect(sanitizeField('tab\there')).toBe('tabhere');
        expect(sanitizeField('newline\n')).toBe('newline');
        expect(sanitizeField('carriage\rreturn')).toBe('carriagereturn');

        // Test length truncation
        expect(sanitizeField('A'.repeat(600))).toHaveLength(500);
        expect(sanitizeField('A'.repeat(600), 100)).toHaveLength(100);
        expect(sanitizeField('short')).toBe('short');

        // Test non-string input
        expect(sanitizeField(12345)).toBe('12345');
        expect(sanitizeField(null)).toBe('null');
    });

    test('sanitizeMessage utility function works correctly', async () => {
        const { sanitizeMessage } = await import('../../lib/udp_sanitizer.js');

        const msg = ['/test/', 'host\t', 'Task\n', 'A'.repeat(600), 'normal'];
        const sanitized = sanitizeMessage(msg);

        expect(sanitized[0]).toBe('/test/');
        expect(sanitized[1]).toBe('host');
        expect(sanitized[2]).toBe('Task');
        expect(sanitized[3]).toHaveLength(500);
        expect(sanitized[4]).toBe('normal');
    });
});
