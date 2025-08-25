/* eslint-disable import/no-dynamic-require */
import { jest } from '@jest/globals';
import fs from 'fs';
import yaml from 'js-yaml';

describe('scheduler', () => {
    let scheduler;
    let mockGlobals;
    let mockSenseStartTask;
    let mockCronJobManager;

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
            configSchedule: [],
        };

        // Mock CronJobManager
        mockCronJobManager = {
            add: jest.fn(),
            start: jest.fn(),
            stop: jest.fn(),
            deleteJob: jest.fn(),
            listCrons: jest.fn(),
        };

        // Mock dependencies
        await jest.unstable_mockModule('../../../globals.js', () => ({
            default: mockGlobals,
        }));

        await jest.unstable_mockModule('fs', () => ({
            default: {
                writeFileSync: jest.fn(),
                readFileSync: jest.fn(),
            },
        }));

        await jest.unstable_mockModule('js-yaml', () => ({
            default: {
                dump: jest.fn(),
                load: jest.fn(),
            },
        }));

        await jest.unstable_mockModule('cron-job-manager', () => ({
            default: jest.fn().mockImplementation(() => mockCronJobManager),
        }));

        await jest.unstable_mockModule('../../qrs_util/sense_start_task.js', () => ({
            default: jest.fn(),
        }));

        // Import the modules after mocking
        const senseStartTaskModule = await import('../../qrs_util/sense_start_task.js');
        mockSenseStartTask = senseStartTaskModule.default;

        // Import the module under test
        scheduler = await import('../scheduler.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset globals
        mockGlobals.configSchedule = [];
        
        // Reset default config responses
        mockConfig.has.mockReturnValue(true);
        mockConfig.get.mockImplementation((key) => {
            const configMap = {
                'Butler.scheduler.enable': true,
                'Butler.scheduler.configfile': './test-schedule.yaml'
            };
            return configMap[key];
        });

        yaml.dump.mockReturnValue('butlerSchedule: []');
        yaml.load.mockReturnValue({ butlerSchedule: [] });
        fs.writeFileSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('butlerSchedule: []');
    });

    describe('addSchedule', () => {
        const mockSchedule = {
            id: 1,
            name: 'Test Schedule',
            cronSchedule: '0 */2 * * *',
            qlikSenseTaskId: 'task123',
            startupState: 'started',
            timeZone: 'UTC'
        };

        test('should successfully add a new schedule', () => {
            scheduler.addSchedule(mockSchedule);

            expect(mockGlobals.configSchedule).toHaveLength(1);
            expect(mockGlobals.configSchedule[0]).toEqual({
                ...mockSchedule,
                lastKnownState: 'started'
            });
            expect(yaml.dump).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(mockCronJobManager.add).toHaveBeenCalledWith(
                '1',
                '0 */2 * * *',
                expect.any(Function),
                {
                    start: true,
                    timeZone: 'UTC'
                }
            );
            expect(mockLogger.verbose).toHaveBeenCalledWith(
                expect.stringContaining('Added new schedule')
            );
        });

        test('should add schedule with stopped startup state', () => {
            const stoppedSchedule = {
                ...mockSchedule,
                startupState: 'stopped'
            };

            scheduler.addSchedule(stoppedSchedule);

            expect(mockGlobals.configSchedule[0].lastKnownState).toBe('stopped');
            expect(mockCronJobManager.add).toHaveBeenCalledWith(
                '1',
                '0 */2 * * *',
                expect.any(Function),
                {
                    start: false,
                    timeZone: 'UTC'
                }
            );
        });

        test('should handle startup state "start" as started', () => {
            const startSchedule = {
                ...mockSchedule,
                startupState: 'start'
            };

            scheduler.addSchedule(startSchedule);

            expect(mockGlobals.configSchedule[0].lastKnownState).toBe('started');
            expect(mockCronJobManager.add).toHaveBeenCalledWith(
                '1',
                '0 */2 * * *',
                expect.any(Function),
                {
                    start: true,
                    timeZone: 'UTC'
                }
            );
        });

        test('should handle errors during schedule addition', () => {
            fs.writeFileSync.mockImplementation(() => {
                throw new Error('File write error');
            });

            scheduler.addSchedule(mockSchedule);

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed adding new schedule')
            );
        });

        test('should execute cron job callback correctly', () => {
            scheduler.addSchedule(mockSchedule);

            // Get the callback function that was passed to cron manager
            const cronCallback = mockCronJobManager.add.mock.calls[0][2];
            
            // Execute the callback
            cronCallback();

            expect(mockLogger.info).toHaveBeenCalledWith(
                'SCHEDULER: Cron event for schedule ID 1: Test Schedule'
            );
            expect(mockSenseStartTask).toHaveBeenCalledWith('task123');
        });
    });

    describe('loadSchedulesFromDisk', () => {
        test('should successfully load schedules from disk', () => {
            const mockSchedules = [
                {
                    id: 1,
                    name: 'Test Schedule 1',
                    cronSchedule: '0 */2 * * *',
                    qlikSenseTaskId: 'task123',
                    startupState: 'started',
                    timeZone: 'UTC'
                },
                {
                    id: 2,
                    name: 'Test Schedule 2',
                    cronSchedule: '0 */3 * * *',
                    qlikSenseTaskId: 'task456',
                    startupState: 'stopped',
                    timeZone: 'UTC'
                }
            ];

            yaml.load.mockReturnValue({ butlerSchedule: mockSchedules });

            scheduler.loadSchedulesFromDisk();

            expect(fs.readFileSync).toHaveBeenCalledWith('./test-schedule.yaml', 'utf8');
            expect(yaml.load).toHaveBeenCalled();
            expect(mockGlobals.configSchedule).toHaveLength(2);
            expect(mockLogger.info).toHaveBeenCalledWith(
                'SCHEDULER: Successfully loaded schedule from file.'
            );
        });

        test('should handle case when scheduler is disabled', () => {
            mockConfig.get.mockImplementation((key) => {
                if (key === 'Butler.scheduler.enable') {
                    return false;
                }
                return './test-schedule.yaml';
            });

            scheduler.loadSchedulesFromDisk();

            expect(fs.readFileSync).not.toHaveBeenCalled();
            expect(mockLogger.info).not.toHaveBeenCalled();
        });

        test('should handle case when scheduler config is missing', () => {
            mockConfig.has.mockReturnValue(false);

            scheduler.loadSchedulesFromDisk();

            expect(fs.readFileSync).not.toHaveBeenCalled();
            expect(mockLogger.info).not.toHaveBeenCalled();
        });

        test('should handle errors during file loading', () => {
            fs.readFileSync.mockImplementation(() => {
                throw new Error('File read error');
            });

            scheduler.loadSchedulesFromDisk();

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed loading schedules from file')
            );
        });
    });

    describe('startAllSchedules', () => {
        beforeEach(() => {
            mockGlobals.configSchedule = [
                { id: 1, name: 'Schedule 1', lastKnownState: 'stopped' },
                { id: 2, name: 'Schedule 2', lastKnownState: 'stopped' }
            ];
        });

        test('should successfully start all schedules', async () => {
            const result = await scheduler.startAllSchedules();

            expect(mockCronJobManager.start).toHaveBeenCalledWith('1');
            expect(mockCronJobManager.start).toHaveBeenCalledWith('2');
            expect(mockGlobals.configSchedule[0].lastKnownState).toBe('started');
            expect(mockGlobals.configSchedule[1].lastKnownState).toBe('started');
            expect(yaml.dump).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(result).toBeUndefined(); // Promise resolves without value
        });

        test('should handle errors during start all', async () => {
            mockCronJobManager.start.mockImplementation(() => {
                throw new Error('Cron start error');
            });

            try {
                await scheduler.startAllSchedules();
            } catch (error) {
                // Expected to reject
            }

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed starting all schedules')
            );
        });
    });

    describe('stopAllSchedules', () => {
        beforeEach(() => {
            mockGlobals.configSchedule = [
                { id: 1, name: 'Schedule 1', lastKnownState: 'started' },
                { id: 2, name: 'Schedule 2', lastKnownState: 'started' }
            ];
        });

        test('should successfully stop all schedules', async () => {
            const result = await scheduler.stopAllSchedules();

            expect(mockCronJobManager.stop).toHaveBeenCalledWith('1');
            expect(mockCronJobManager.stop).toHaveBeenCalledWith('2');
            expect(mockGlobals.configSchedule[0].lastKnownState).toBe('stopped');
            expect(mockGlobals.configSchedule[1].lastKnownState).toBe('stopped');
            expect(yaml.dump).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
            expect(result).toBeUndefined(); // Promise resolves without value
        });

        test('should handle errors during stop all', async () => {
            mockCronJobManager.stop.mockImplementation(() => {
                throw new Error('Cron stop error');
            });

            try {
                await scheduler.stopAllSchedules();
            } catch (error) {
                // Expected to reject
            }

            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed stopping all schedules')
            );
        });
    });

    describe('getSchedulesStatus', () => {
        test('should return cron list from manager', () => {
            const mockCronList = [
                { id: '1', status: 'running' },
                { id: '2', status: 'stopped' }
            ];
            mockCronJobManager.listCrons.mockReturnValue(mockCronList);

            const result = scheduler.getSchedulesStatus();

            expect(mockCronJobManager.listCrons).toHaveBeenCalled();
            expect(result).toEqual(mockCronList);
            expect(mockLogger.debug).toHaveBeenCalledWith('SCHEDULER: Getting all crons');
        });
    });

    describe('getAllSchedules', () => {
        test('should return all schedules from globals', () => {
            const mockSchedules = [
                { id: 1, name: 'Schedule 1' },
                { id: 2, name: 'Schedule 2' }
            ];
            mockGlobals.configSchedule = mockSchedules;

            const result = scheduler.getAllSchedules();

            expect(result).toEqual(mockSchedules);
            expect(mockLogger.debug).toHaveBeenCalledWith('SCHEDULER: Getting all schedules');
        });
    });

    describe('getSchedule', () => {
        beforeEach(() => {
            mockGlobals.configSchedule = [
                { id: 1, name: 'Schedule 1' },
                { id: 2, name: 'Schedule 2' }
            ];
        });

        test('should return schedule by ID', () => {
            const result = scheduler.getSchedule(1);

            expect(result).toEqual({ id: 1, name: 'Schedule 1' });
            expect(mockLogger.debug).toHaveBeenCalledWith('SCHEDULER: Getting schedule');
        });

        test('should return undefined for non-existent schedule', () => {
            const result = scheduler.getSchedule(999);

            expect(result).toBeUndefined();
        });
    });

    describe('existsSchedule', () => {
        beforeEach(() => {
            mockGlobals.configSchedule = [
                { id: 1, name: 'Schedule 1' },
                { id: 2, name: 'Schedule 2' }
            ];
        });

        test('should return true for existing schedule', () => {
            const result = scheduler.existsSchedule(1);

            expect(result).toBe(true);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'SCHEDULER: Does schedule id 1 exist: true'
            );
        });

        test('should return false for non-existent schedule', () => {
            const result = scheduler.existsSchedule(999);

            expect(result).toBe(false);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'SCHEDULER: Does schedule id 999 exist: false'
            );
        });
    });

    describe('deleteSchedule', () => {
        beforeEach(() => {
            mockGlobals.configSchedule = [
                { id: 1, name: 'Schedule 1' },
                { id: 2, name: 'Schedule 2' }
            ];
        });

        test('should successfully delete existing schedule', () => {
            const result = scheduler.deleteSchedule(1);

            expect(result).toBe(true);
            expect(mockGlobals.configSchedule).toHaveLength(1);
            expect(mockGlobals.configSchedule[0].id).toBe(2);
            expect(mockCronJobManager.deleteJob).toHaveBeenCalledWith('1');
            expect(yaml.dump).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        test('should return false for non-existent schedule', () => {
            const result = scheduler.deleteSchedule(999);

            expect(result).toBe(false);
            expect(mockGlobals.configSchedule).toHaveLength(2); // No change
            expect(mockCronJobManager.deleteJob).not.toHaveBeenCalled();
        });

        test('should handle errors during deletion', () => {
            mockCronJobManager.deleteJob.mockImplementation(() => {
                throw new Error('Delete error');
            });

            const result = scheduler.deleteSchedule(1);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed deleting schedule 1')
            );
        });
    });

    describe('startSchedule', () => {
        beforeEach(() => {
            mockGlobals.configSchedule = [
                { id: 1, name: 'Schedule 1', lastKnownState: 'stopped' }
            ];
        });

        test('should successfully start schedule', () => {
            const result = scheduler.startSchedule(1);

            expect(result).toBe(true);
            expect(mockCronJobManager.start).toHaveBeenCalledWith('1');
            expect(mockGlobals.configSchedule[0].lastKnownState).toBe('started');
            expect(yaml.dump).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        test('should handle errors during start', () => {
            mockCronJobManager.start.mockImplementation(() => {
                throw new Error('Start error');
            });

            const result = scheduler.startSchedule(1);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed starting schedule ID 1')
            );
        });
    });

    describe('stopSchedule', () => {
        beforeEach(() => {
            mockGlobals.configSchedule = [
                { id: 1, name: 'Schedule 1', lastKnownState: 'started' }
            ];
        });

        test('should successfully stop schedule', () => {
            const result = scheduler.stopSchedule(1);

            expect(result).toBe(true);
            expect(mockCronJobManager.stop).toHaveBeenCalledWith('1');
            expect(mockGlobals.configSchedule[0].lastKnownState).toBe('stopped');
            expect(yaml.dump).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        test('should handle errors during stop', () => {
            mockCronJobManager.stop.mockImplementation(() => {
                throw new Error('Stop error');
            });

            const result = scheduler.stopSchedule(1);

            expect(result).toBe(false);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed stopping schedule ID 1')
            );
        });
    });
});