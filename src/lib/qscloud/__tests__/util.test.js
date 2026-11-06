import { jest } from '@jest/globals';
import { legacyEvent, cloudEvent, toCloudEventsFormat } from './qscloud_events.js';

describe('lib/qscloud/util', () => {
    let getQlikSenseCloudUrls;
    let getQlikSenseCloudEventAttributes;
    const mockGlobals = {
        config: {
            get: jest.fn(),
        },
        getErrorMessage: jest.fn((err) => err?.message || err?.toString() || 'Unknown error'),
    };

    beforeAll(async () => {
        await jest.unstable_mockModule('../../../globals.js', () => ({ default: mockGlobals }));
        ({ getQlikSenseCloudUrls, getQlikSenseCloudEventAttributes } = await import('../util.js'));
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('returns QMC and Hub URLs from config', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc') {
                return 'https://tenant.qlikcloud.com/console';
            }
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub') {
                return 'https://tenant.qlikcloud.com/sense';
            }
            return undefined;
        });

        const result = getQlikSenseCloudUrls();

        expect(result).toEqual({
            qmcUrl: 'https://tenant.qlikcloud.com/console',
            hubUrl: 'https://tenant.qlikcloud.com/sense',
        });
        expect(mockGlobals.config.get).toHaveBeenCalledWith('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc');
        expect(mockGlobals.config.get).toHaveBeenCalledWith('Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.hub');
    });

    test('returns undefined values when config is not set', () => {
        mockGlobals.config.get.mockReturnValue(undefined);

        const result = getQlikSenseCloudUrls();

        expect(result).toEqual({
            qmcUrl: undefined,
            hubUrl: undefined,
        });
    });

    test('handles partial config correctly', () => {
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.qlikSenseCloud.event.mqtt.tenant.qlikSenseUrls.qmc') {
                return 'https://tenant.qlikcloud.com/console';
            }
            return undefined; // hubUrl is undefined
        });

        const result = getQlikSenseCloudUrls();

        expect(result).toEqual({
            qmcUrl: 'https://tenant.qlikcloud.com/console',
            hubUrl: undefined,
        });
    });

    describe('getQlikSenseCloudEventAttributes', () => {
        // What Butler uses from the test events

        const attributes = {
            eventType: 'com.qlik.v1.app.reload.finished',
            eventTime: '2026-11-06T10:15:00Z',
            source: 'com.qlik/engine',
            tenantId: 'tenant-1',
            userId: 'user-1',
            ownerId: 'owner-1',
            topLevelResourceId: 'app-1',
        };

        test('has test events whose CloudEvents one is the legacy one converted, so other tests can convert theirs', () => {
            expect(toCloudEventsFormat(legacyEvent)).toEqual(cloudEvent);
        });

        test('reads an event in the legacy format', () => {
            expect(getQlikSenseCloudEventAttributes(legacyEvent)).toEqual({ ...attributes, eventTypeVersion: '1.0.0' });
        });

        test('reads an event in the CloudEvents format, which has no event type version', () => {
            expect(getQlikSenseCloudEventAttributes(cloudEvent)).toEqual({ ...attributes, eventTypeVersion: undefined });
        });

        test('reads an event with the attributes of both formats, as Qlik Sense Cloud sends until 10 December 2026', () => {
            expect(getQlikSenseCloudEventAttributes({ ...legacyEvent, ...cloudEvent })).toEqual({
                ...attributes,
                eventTypeVersion: '1.0.0',
            });
        });

        test('takes an attribute from the CloudEvents format when the two formats differ', () => {
            const event = {
                ...legacyEvent,
                ...cloudEvent,
                type: 'com.qlik.v1.app.opened',
                time: '2026-11-06T10:15:01Z',
                tenantid: 'tenant-2',
                userid: 'user-2',
                ownerid: 'owner-2',
                toplevelresourceid: 'app-2',
            };

            expect(getQlikSenseCloudEventAttributes(event)).toEqual({
                eventType: 'com.qlik.v1.app.opened',
                eventTime: '2026-11-06T10:15:01Z',
                eventTypeVersion: '1.0.0',
                source: 'com.qlik/engine',
                tenantId: 'tenant-2',
                userId: 'user-2',
                ownerId: 'owner-2',
                topLevelResourceId: 'app-2',
            });
        });

        test('takes an attribute from the legacy format when the CloudEvents one is empty', () => {
            const event = {
                ...legacyEvent,
                ...cloudEvent,
                type: '',
                time: '',
                tenantid: '',
                userid: '',
                ownerid: '',
                toplevelresourceid: '',
            };

            expect(getQlikSenseCloudEventAttributes(event)).toEqual({ ...attributes, eventTypeVersion: '1.0.0' });
        });

        test('gives undefined for an attribute the event has in neither format', () => {
            expect(getQlikSenseCloudEventAttributes({ data: {} })).toStrictEqual({
                eventType: undefined,
                eventTime: undefined,
                eventTypeVersion: undefined,
                source: undefined,
                authType: undefined,
                tenantId: undefined,
                userId: undefined,
                ownerId: undefined,
                topLevelResourceId: undefined,
            });
        });

        test('gives the type of principal that triggered the event, which only the CloudEvents format has', () => {
            expect(getQlikSenseCloudEventAttributes({ ...legacyEvent, ...cloudEvent, authtype: 'service_account' }).authType).toBe(
                'service_account',
            );
            expect(getQlikSenseCloudEventAttributes(legacyEvent).authType).toBeUndefined();
        });
    });
});
