import { jest } from '@jest/globals';

describe('lib/scheduler', () => {
    let addSchedule, loadSchedulesFromDisk, startAllSchedules, stopAllSchedules, 
        getSchedulesStatus, getAllSchedules, getSchedule, existsSchedule, 
        deleteSchedule, startSchedule, stopSchedule;
    
    const mockGlobals = {
        config: {
            has: jest.fn(),
            get: jest.fn(),
        },
        logger: {
            error: jest.fn(),
            warn: jest.fn(),
            info: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        },
        configSchedule: [],
    };

    const mockFs = {
        writeFileSync: jest.fn(),
        readFileSync: jest.fn(),
    };

    const mockYaml = {
        dump: jest.fn(),
        load: jest.fn(),
    };

    const mockCronJobManager = jest.fn().mockImplementation(() => ({
        add: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        deleteJob: jest.fn(),
        listCrons: jest.fn(),
    }));

    const mockSenseStartTask = jest.fn();

    beforeAll(async () => {
        await jest.unstable_mockModule('../../globals.js', () => ({ default: mockGlobals }));
        await jest.unstable_mockModule('fs', () => ({ default: mockFs }));
        await jest.unstable_mockModule('js-yaml', () => ({ default: mockYaml }));
        await jest.unstable_mockModule('cron-job-manager', () => ({ default: mockCronJobManager }));
        await jest.unstable_mockModule('../../qrs_util/sense_start_task.js', () => ({ default: mockSenseStartTask }));

        const module = await import('../scheduler.js');
        ({
            addSchedule,
            loadSchedulesFromDisk,
            startAllSchedules,
            stopAllSchedules,
            getSchedulesStatus,
            getAllSchedules,
            getSchedule,
            existsSchedule,
            deleteSchedule,
            startSchedule,
            stopSchedule,
        } = module);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockGlobals.configSchedule = [];
        mockGlobals.config.has.mockReturnValue(true);
        mockGlobals.config.get.mockImplementation((key) => {
            if (key === 'Butler.scheduler.enable') return true;
            if (key === 'Butler.scheduler.configfile') return './test-schedule.yaml';
            return true;
        });
        
        mockYaml.dump.mockReturnValue('butlerSchedule: []');
        mockYaml.load.mockReturnValue({ butlerSchedule: [] });
        mockFs.writeFileSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue('butlerSchedule: []');
    });

    describe('addSchedule', () => {
        test('should add a basic schedule', () => {
            const testSchedule = {
                id: 1,
                name: 'Test Schedule',
                cronSchedule: '0 */2 * * *',
                qlikSenseTaskId: 'task123',
                startupState: 'started',
                timeZone: 'UTC'
            };

            addSchedule(testSchedule);

            expect(mockGlobals.configSchedule).toHaveLength(1);
            expect(mockGlobals.configSchedule[0].id).toBe(1);
            expect(mockYaml.dump).toHaveBeenCalled();
            expect(mockFs.writeFileSync).toHaveBeenCalled();
        });
    });

    describe('loadSchedulesFromDisk', () => {
        test('should load schedules when enabled', () => {
            mockYaml.load.mockReturnValue({
                butlerSchedule: [
                    { id: 1, name: 'Test Schedule', cronSchedule: '0 */2 * * *', qlikSenseTaskId: 'task123', startupState: 'started' }
                ]
            });

            loadSchedulesFromDisk();

            expect(mockFs.readFileSync).toHaveBeenCalledWith('./test-schedule.yaml', 'utf8');
            expect(mockGlobals.logger.info).toHaveBeenCalledWith('SCHEDULER: Successfully loaded schedule from file.');
        });

        test('should handle disabled scheduler', () => {
            mockGlobals.config.get.mockImplementation((key) => {
                if (key === 'Butler.scheduler.enable') return false;
                return './test-schedule.yaml';
            });

            loadSchedulesFromDisk();

            expect(mockFs.readFileSync).not.toHaveBeenCalled();
        });

        test('should handle missing config', () => {
            mockGlobals.config.has.mockReturnValue(false);

            loadSchedulesFromDisk();

            expect(mockFs.readFileSync).not.toHaveBeenCalled();
        });

        test('should handle file errors', () => {
            mockFs.readFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            loadSchedulesFromDisk();

            expect(mockGlobals.logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed loading schedules from file')
            );
        });
    });

    describe('getAllSchedules', () => {
        test('should return all schedules', () => {
            mockGlobals.configSchedule = [{ id: 1 }, { id: 2 }];

            const result = getAllSchedules();

            expect(result).toEqual([{ id: 1 }, { id: 2 }]);
            expect(mockGlobals.logger.debug).toHaveBeenCalledWith('SCHEDULER: Getting all schedules');
        });
    });

    describe('getSchedule', () => {
        test('should return specific schedule by ID', () => {
            mockGlobals.configSchedule = [{ id: 1, name: 'First' }, { id: 2, name: 'Second' }];

            const result = getSchedule(1);

            expect(result).toEqual({ id: 1, name: 'First' });
        });

        test('should return undefined for non-existent schedule', () => {
            mockGlobals.configSchedule = [{ id: 1, name: 'First' }];

            const result = getSchedule(999);

            expect(result).toBeUndefined();
        });
    });

    describe('existsSchedule', () => {
        test('should return true for existing schedule', () => {
            mockGlobals.configSchedule = [{ id: 1 }, { id: 2 }];

            const result = existsSchedule(1);

            expect(result).toBe(true);
            expect(mockGlobals.logger.debug).toHaveBeenCalledWith(
                'SCHEDULER: Does schedule id 1 exist: true'
            );
        });

        test('should return false for non-existent schedule', () => {
            mockGlobals.configSchedule = [{ id: 1 }];

            const result = existsSchedule(999);

            expect(result).toBe(false);
            expect(mockGlobals.logger.debug).toHaveBeenCalledWith(
                'SCHEDULER: Does schedule id 999 exist: false'
            );
        });
    });
});