import { jest } from '@jest/globals';

describe('lib/post_to_new_relic - postButlerUptimeToNewRelic', () => {
    let postButlerUptimeToNewRelic;
    const mockAxios = { post: jest.fn() };

    const destAccounts = ['acc1', 'acc2'];
    const nrAccounts = [
        { accountName: 'acc1', insertApiKey: 'k1', accountId: 111 },
        { accountName: 'acc2', insertApiKey: 'k2', accountId: 222 },
    ];

    const mockGlobals = {
        appVersion: '1.2.3',
        config: {
            has: jest.fn(),
            get: jest.fn(),
            Butler: {
                uptimeMonitor: {
                    storeNewRelic: { destinationAccount: destAccounts },
                },
            },
        },
        logger: { debug: jest.fn(), verbose: jest.fn(), error: jest.fn() },
    };

    const fields = {
        intervalMillisec: 1000,
        heapUsed: 1,
        heapTotal: 2,
        externalMemory: 3,
        processMemory: 4,
        uptimeMilliSec: 5000,
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('axios', () => ({ default: mockAxios }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        ({ postButlerUptimeToNewRelic } = await import('../post_to_new_relic.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockAxios.post.mockResolvedValue({ status: 202, statusText: 'Accepted' });
        mockGlobals.config.has.mockImplementation((k) => {
            return [
                'Butler.uptimeMonitor.storeNewRelic.attribute.static',
                'Butler.uptimeMonitor.storeNewRelic.attribute.dynamic.butlerVersion.enable',
                'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerMemoryUsage.enable',
                'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerUptime.enable',
            ].includes(k);
        });
        mockGlobals.config.get.mockImplementation((k) => {
            const map = {
                'Butler.uptimeMonitor.storeNewRelic.attribute.static': [{ name: 'env', value: 'test' }],
                'Butler.uptimeMonitor.storeNewRelic.attribute.dynamic.butlerVersion.enable': true,
                'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerMemoryUsage.enable': true,
                'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerUptime.enable': true,
                'Butler.uptimeMonitor.storeNewRelic.url': 'https://nr.example/metric',
                'Butler.uptimeMonitor.storeNewRelic.header': [{ name: 'X-Extra', value: 'v' }],
                'Butler.thirdPartyToolsCredentials.newRelic': nrAccounts,
                'Butler.uptimeMonitor.storeNewRelic.destinationAccount': destAccounts,
            };
            return map[k];
        });
    });

    test('posts payload to each destination account on success', async () => {
        await postButlerUptimeToNewRelic(fields);
        expect(mockAxios.post).toHaveBeenCalledTimes(2);
        // Verify Api-Key header used for second call
        const lastCall = mockAxios.post.mock.calls[1];
        expect(lastCall[0]).toBe('https://nr.example/metric');
        expect(lastCall[2].headers['Api-Key']).toBe('k2');
    });

    test('logs error on non-202/200 status', async () => {
        mockAxios.post.mockResolvedValue({ status: 500, statusText: 'Boom' });
        await postButlerUptimeToNewRelic(fields);
        expect(mockGlobals.logger.error).toHaveBeenCalled();
    });

    test('no destination accounts -> does not post', async () => {
        mockGlobals.config.get.mockImplementation((k) => {
            const map = {
                'Butler.uptimeMonitor.storeNewRelic.attribute.static': [{ name: 'env', value: 'test' }],
                'Butler.uptimeMonitor.storeNewRelic.attribute.dynamic.butlerVersion.enable': true,
                'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerMemoryUsage.enable': true,
                'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerUptime.enable': true,
                'Butler.uptimeMonitor.storeNewRelic.url': 'https://nr.example/metric',
                'Butler.uptimeMonitor.storeNewRelic.header': [{ name: 'X-Extra', value: 'v' }],
                'Butler.thirdPartyToolsCredentials.newRelic': nrAccounts,
                'Butler.uptimeMonitor.storeNewRelic.destinationAccount': undefined,
            };
            return map[k];
        });
        await postButlerUptimeToNewRelic(fields);
        expect(mockAxios.post).not.toHaveBeenCalled();
    });

    test('axios throws -> logs error', async () => {
        mockAxios.post.mockRejectedValue(new Error('network'));
        await postButlerUptimeToNewRelic(fields);
        expect(mockGlobals.logger.error).toHaveBeenCalled();
    });
});

describe('lib/post_to_new_relic', () => {
    let postButlerUptimeToNewRelic;

    const requests = [];
    const mockAxios = {
        post: jest.fn(async (url, payload, opts) => {
            requests.push({ url, payload, opts });
            return { status: 202, statusText: 'Accepted' };
        }),
    };

    const baseGlobals = {
        appVersion: '9.9.9',
        config: {
            has: jest.fn((k) => {
                const set = new Set([
                    'Butler.uptimeMonitor.storeNewRelic.attribute.static',
                    'Butler.uptimeMonitor.storeNewRelic.attribute.dynamic.butlerVersion.enable',
                    'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerMemoryUsage.enable',
                    'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerUptime.enable',
                ]);
                return set.has(k);
            }),
            get: jest.fn((k) => {
                const map = {
                    'Butler.uptimeMonitor.storeNewRelic.attribute.static': [{ name: 'env', value: 'test' }],
                    'Butler.uptimeMonitor.storeNewRelic.attribute.dynamic.butlerVersion.enable': true,
                    'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerMemoryUsage.enable': true,
                    'Butler.uptimeMonitor.storeNewRelic.metric.dynamic.butlerUptime.enable': true,
                    'Butler.uptimeMonitor.storeNewRelic.url': 'https://metric.nr/api',
                    'Butler.uptimeMonitor.storeNewRelic.header': [{ name: 'X-Custom', value: 'yes' }],
                    'Butler.thirdPartyToolsCredentials.newRelic': [
                        { accountName: 'accA', insertApiKey: 'keyA', accountId: 1 },
                        { accountName: 'accB', insertApiKey: 'keyB', accountId: 2 },
                    ],
                    'Butler.uptimeMonitor.storeNewRelic.destinationAccount': ['accA', 'accB'],
                };
                return map[k];
            }),
            Butler: {
                uptimeMonitor: {
                    storeNewRelic: {
                        destinationAccount: ['accA', 'accB'],
                    },
                },
            },
        },
        logger: {
            debug: jest.fn(),
            verbose: jest.fn(),
            error: jest.fn(),
        },
    };

    const loadModule = async (globalsOverride) => {
        jest.resetModules();
        requests.length = 0;
        await jest.unstable_mockModule('axios', () => ({ default: mockAxios }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: globalsOverride || baseGlobals }));
        ({ postButlerUptimeToNewRelic } = await import('../post_to_new_relic.js'));
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        await loadModule();
    });

    test('posts composed payload to multiple accounts with headers', async () => {
        await postButlerUptimeToNewRelic({
            intervalMillisec: 1000,
            heapUsed: 11,
            heapTotal: 22,
            externalMemory: 33,
            processMemory: 44,
            uptimeMilliSec: 555,
        });

        expect(mockAxios.post).toHaveBeenCalledTimes(2);
        for (const req of requests) {
            expect(req.url).toBe('https://metric.nr/api');
            expect(req.opts.headers['Content-Type']).toContain('application/json');
            expect(req.opts.headers['X-Custom']).toBe('yes');
            expect(['keyA', 'keyB']).toContain(req.opts.headers['Api-Key']);
            expect(req.payload[0].metrics.find((m) => m.name === 'qs_butlerUptimeMillisec').value).toBe(555);
            expect(req.payload[0].common['interval.ms']).toBe(1000);
            expect(req.payload[0].common.attributes.env).toBe('test');
            expect(req.payload[0].common.attributes.version).toBe('9.9.9');
        }
    });

    test('handles error path gracefully', async () => {
        const errorAxios = {
            post: jest.fn(() => {
                throw new Error('nope');
            }),
        };
        await loadModule({
            ...baseGlobals,
            logger: baseGlobals.logger,
        });
        // swap axios mock to throwing one
        jest.resetModules();
        await jest.unstable_mockModule('axios', () => ({ default: errorAxios }));
        await jest.unstable_mockModule('../../globals.js', () => ({ default: baseGlobals }));
        ({ postButlerUptimeToNewRelic } = await import('../post_to_new_relic.js'));
        await postButlerUptimeToNewRelic({ intervalMillisec: 1 });
        expect(baseGlobals.logger.error).toHaveBeenCalled();
    });
});
