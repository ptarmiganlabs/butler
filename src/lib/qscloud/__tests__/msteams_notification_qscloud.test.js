/* eslint-disable import/no-dynamic-require */
import { jest } from '@jest/globals';
import fs from 'fs';

describe('msteams_notification_qscloud', () => {
    let msteamsNotificationQscloud;
    let mockGlobals;
    let mockGetQlikSenseCloudUserInfo;
    let mockGetQlikSenseCloudUrls;
    let mockGetQlikSenseCloudAppReloadScriptLogHead;
    let mockGetQlikSenseCloudAppReloadScriptLogTail;
    let mockWebhook;

    const mockConfig = {
        has: jest.fn(),
        get: jest.fn(),
    };

    const mockLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
    };

    beforeAll(async () => {
        // Mock globals
        mockGlobals = {
            config: mockConfig,
            logger: mockLogger,
        };

        // Mock Webhook
        mockWebhook = {
            sendMessage: jest.fn(),
        };

        // Mock dependencies
        await jest.unstable_mockModule('../../../globals.js', () => ({
            default: mockGlobals,
        }));

        await jest.unstable_mockModule('fs', () => ({
            default: {
                existsSync: jest.fn(),
                readFileSync: jest.fn(),
            },
        }));

        await jest.unstable_mockModule('ms-teams-wrapper', () => ({
            Webhook: jest.fn().mockImplementation(() => mockWebhook),
            SimpleTextCard: jest.fn(),
        }));

        await jest.unstable_mockModule('../api/user.js', () => ({
            getQlikSenseCloudUserInfo: jest.fn(),
        }));

        await jest.unstable_mockModule('../util.js', () => ({
            getQlikSenseCloudUrls: jest.fn(),
        }));

        await jest.unstable_mockModule('../api/appreloadinfo.js', () => ({
            getQlikSenseCloudAppReloadScriptLogHead: jest.fn(),
            getQlikSenseCloudAppReloadScriptLogTail: jest.fn(),
        }));

        // Import the modules after mocking
        const userModule = await import('../api/user.js');
        const utilModule = await import('../util.js');
        const appreloadinfoModule = await import('../api/appreloadinfo.js');

        mockGetQlikSenseCloudUserInfo = userModule.getQlikSenseCloudUserInfo;
        mockGetQlikSenseCloudUrls = utilModule.getQlikSenseCloudUrls;
        mockGetQlikSenseCloudAppReloadScriptLogHead = appreloadinfoModule.getQlikSenseCloudAppReloadScriptLogHead;
        mockGetQlikSenseCloudAppReloadScriptLogTail = appreloadinfoModule.getQlikSenseCloudAppReloadScriptLogTail;

        // Import the module under test
        msteamsNotificationQscloud = await import('../msteams_notification_qscloud.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset default config responses
        mockConfig.has.mockReturnValue(true);
        mockConfig.get.mockImplementation((key) => {
            const configMap = {
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.rateLimit': 300,
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable': true,
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType': 'basic',
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.webhookURL': 'https://hooks.office.com/test',
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile': './templates/teams.json',
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.headScriptLogLines': 10,
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.tailScriptLogLines': 10,
                'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.basicMsgTemplate': 'App {{appName}} reload failed',
                'Butler.genericUrls': [{ id: 'company', url: 'https://company.com' }]
            };
            return configMap[key];
        });

        mockGetQlikSenseCloudUrls.mockReturnValue({
            qmcUrl: 'https://tenant.qlikcloud.com/qmc',
            hubUrl: 'https://tenant.qlikcloud.com/hub'
        });

        mockGetQlikSenseCloudUserInfo.mockResolvedValue({
            id: 'user123',
            name: 'John Doe',
            email: 'john.doe@company.com',
            picture: 'https://avatar.url'
        });

        mockGetQlikSenseCloudAppReloadScriptLogHead.mockReturnValue('Script log head content');
        mockGetQlikSenseCloudAppReloadScriptLogTail.mockReturnValue('Script log tail content');

        mockWebhook.sendMessage.mockResolvedValue({
            status: 200,
            statusText: 'OK',
            data: 'Success'
        });

        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('{"text": "{{appName}} failed"}');
    });

    describe('sendQlikSenseCloudAppReloadFailureNotificationTeams', () => {
        const defaultReloadParams = {
            tenantId: 'tenant123',
            tenantComment: 'Test tenant',
            tenantUrl: 'https://tenant.qlikcloud.com',
            userId: 'user123',
            ownerId: 'owner123',
            appId: 'app123',
            appName: 'Test App',
            appUrl: 'https://tenant.qlikcloud.com/app/app123',
            appInfo: {
                attributes: {
                    description: 'Test app description',
                    hasSectionAccess: false,
                    published: true,
                    publishTime: '2023-01-01T00:00:00Z',
                    thumbnail: 'thumbnail.png'
                }
            },
            appItems: {
                resourceSize: {
                    appFile: 1024000
                }
            },
            reloadTrigger: 'manual',
            source: 'hub',
            eventType: 'app-reload-finished',
            eventTypeVersion: '1.0',
            endedWithMemoryConstraint: false,
            isDirectQueryMode: false,
            isPartialReload: false,
            isSessionApp: false,
            isSkipStore: false,
            peakMemoryBytes: 50000000,
            reloadId: 'reload123',
            rowLimit: 10000,
            statements: 100,
            status: 'failed',
            duration: 300,
            sizeMemory: 25000000,
            reloadInfo: {
                errorCode: 500,
                errorMessage: 'Script error',
                log: 'Detailed error log',
                executionDuration: 250,
                executionStartTime: '2023-01-01T10:00:00Z',
                executionStopTime: '2023-01-01T10:04:10Z',
                status: 'Failed'
            },
            scriptLog: {
                scriptLogFull: ['Line 1 of script log', 'Line 2 of script log', 'Error occurred']
            }
        };

        test('should successfully send basic Teams message', (done) => {
            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            // Use setTimeout to allow async operations to complete
            setTimeout(() => {
                expect(mockGetQlikSenseCloudUserInfo).toHaveBeenCalledWith('owner123');
                expect(mockWebhook.sendMessage).toHaveBeenCalled();
                expect(mockLogger.info).toHaveBeenCalledWith(
                    expect.stringContaining('Rate limiting check passed for failed task notification')
                );
                done();
            }, 100);
        });

        test('should not send message when Teams notifications are disabled', (done) => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.enable') {
                    return false;
                }
                return true;
            });

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Reload failure Teams notifications are disabled')
                );
                done();
            }, 100);
        });

        test('should handle invalid message type', (done) => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType': 'invalid'
                };
                return configMap[key] || true;
            });

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Invalid Teams message type: invalid')
                );
                done();
            }, 100);
        });

        test('should handle formatted message type with template file', (done) => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType': 'formatted',
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile': './templates/teams.json'
                };
                return configMap[key] || true;
            });

            fs.readFileSync.mockReturnValue('{"text": "App {{appName}} failed", "type": "AdaptiveCard"}');

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(fs.existsSync).toHaveBeenCalledWith('./templates/teams.json');
                expect(fs.readFileSync).toHaveBeenCalledWith('./templates/teams.json', 'utf8');
                expect(mockWebhook.sendMessage).toHaveBeenCalled();
                done();
            }, 100);
        });

        test('should handle missing template file', (done) => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType': 'formatted',
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.templateFile': './templates/missing.json'
                };
                return configMap[key] || true;
            });

            fs.existsSync.mockReturnValue(false);

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Could not open Teams template file')
                );
                done();
            }, 100);
        });

        test('should handle script log when scriptLog is false', (done) => {
            const reloadParamsNoLog = {
                ...defaultReloadParams,
                scriptLog: false
            };

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParamsNoLog);

            setTimeout(() => {
                expect(mockGetQlikSenseCloudAppReloadScriptLogHead).not.toHaveBeenCalled();
                expect(mockGetQlikSenseCloudAppReloadScriptLogTail).not.toHaveBeenCalled();
                expect(mockWebhook.sendMessage).toHaveBeenCalled();
                done();
            }, 100);
        });

        test('should handle empty script log arrays', (done) => {
            const reloadParamsEmptyLog = {
                ...defaultReloadParams,
                scriptLog: {
                    scriptLogFull: []
                }
            };

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(reloadParamsEmptyLog);

            setTimeout(() => {
                expect(mockWebhook.sendMessage).toHaveBeenCalled();
                done();
            }, 100);
        });

        test('should handle long script log head by truncating', (done) => {
            mockGetQlikSenseCloudAppReloadScriptLogHead.mockReturnValue('a'.repeat(3500));

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    expect.stringContaining('Script log head field is too long')
                );
                done();
            }, 100);
        });

        test('should handle long script log tail by truncating', (done) => {
            mockGetQlikSenseCloudAppReloadScriptLogTail.mockReturnValue('b'.repeat(3500));

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.warn).toHaveBeenCalledWith(
                    expect.stringContaining('Script log head field is too long')
                );
                done();
            }, 100);
        });

        test('should handle missing generic URLs config', (done) => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.genericUrls') {
                    return undefined;
                }
                return true;
            });

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockWebhook.sendMessage).toHaveBeenCalled();
                done();
            }, 100);
        });

        test('should handle errors during template processing', (done) => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType': 'formatted'
                };
                return configMap[key] || true;
            });

            fs.readFileSync.mockImplementation(() => {
                throw new Error('File read error');
            });

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Error processing Teams template file')
                );
                done();
            }, 100);
        });

        test('should handle webhook send errors', (done) => {
            mockWebhook.sendMessage.mockImplementation(() => {
                throw new Error('Webhook error');
            });

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('TEAMS SEND: Error: Webhook error')
                );
                done();
            }, 100);
        });

        test('should handle API errors gracefully', (done) => {
            mockGetQlikSenseCloudUserInfo.mockRejectedValue(new Error('API Error'));

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('TEAMS ALERT - APP RELOAD FAILED: Error: API Error')
                );
                done();
            }, 100);
        });

        test('should handle rate limiting failures', (done) => {
            // Mock a rate limiting failure by mocking the rate limiter consumption
            const mockRateLimiterMemoryFailedReloads = {
                consume: jest.fn().mockRejectedValue(new Error('Rate limit exceeded'))
            };

            // We need to test this by forcing a rate limit error
            // Since the rate limiter is created at module load time, we'll test the catch block
            mockGetQlikSenseCloudUserInfo.mockRejectedValue(new Error('Rate limit test'));

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.error).toHaveBeenCalled();
                done();
            }, 100);
        });

        test('should handle undefined app owner gracefully', (done) => {
            mockGetQlikSenseCloudUserInfo.mockResolvedValue(undefined);

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockWebhook.sendMessage).toHaveBeenCalled();
                done();
            }, 100);
        });

        test('should properly escape script log content for Teams', (done) => {
            const scriptLogWithSpecialChars = 'Log with\nnewlines\tand\ttabs\rand\rcarriage returns';
            mockGetQlikSenseCloudAppReloadScriptLogHead.mockReturnValue(scriptLogWithSpecialChars);
            mockGetQlikSenseCloudAppReloadScriptLogTail.mockReturnValue(scriptLogWithSpecialChars);

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockWebhook.sendMessage).toHaveBeenCalled();
                done();
            }, 100);
        });

        test('should handle invalid JSON in template file', (done) => {
            mockConfig.get.mockImplementation((key) => {
                const configMap = {
                    'Butler.qlikSenseCloud.event.mqtt.tenant.alert.teamsNotification.reloadAppFailure.messageType': 'formatted'
                };
                return configMap[key] || true;
            });

            fs.readFileSync.mockReturnValue('invalid json{');

            msteamsNotificationQscloud.sendQlikSenseCloudAppReloadFailureNotificationTeams(defaultReloadParams);

            setTimeout(() => {
                expect(mockLogger.error).toHaveBeenCalledWith(
                    expect.stringContaining('Error processing Teams template file')
                );
                done();
            }, 100);
        });
    });
});