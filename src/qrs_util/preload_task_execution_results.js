/**
 * Preload Task Execution Results utility module.
 *
 * This module provides functions to retrieve execution results from Qlik Sense preload tasks.
 * Preload tasks are used to load apps into memory for improved user access performance.
 *
 * The main function queries the Qlik Sense Repository Service (QRS) API to retrieve detailed
 * information about the last execution of a preload task, including:
 * - Execution status (success, failed, aborted, etc.)
 * - Execution duration
 * - Start and stop timestamps in multiple formats
 * - Detailed execution step information
 */

import QrsClient from '../lib/qrs_client.js';
import { formatQrsErrorWithContext, formatQrsResultWithContext, hasExpectedQrsStatus } from '../lib/qrs_error.js';
import { Duration, DateTime } from 'luxon';
import globals from '../globals.js';
import { compareTaskDetails } from './task_execution_details_sort.js';

// Mapping of numeric task status codes to human-readable status strings
// These status values come from the Qlik Sense operational.lastExecutionResult.status field
const taskStatusLookup = {
    0: 'NeverStarted',
    1: 'Triggered',
    2: 'Started',
    3: 'Queued',
    4: 'AbortInitiated',
    5: 'Aborting',
    6: 'Aborted',
    7: 'FinishedSuccess',
    8: 'FinishedFail',
    9: 'Skipped',
    10: 'Retry',
    11: 'Error',
    12: 'Reset',
};

/**
 * Gets preload task execution results from the Qlik Sense QRS API.
 *
 * Retrieves detailed information about the last execution of a preload task, including status,
 * duration, start/stop times, and execution step details.
 *
 * @param {string} preloadTaskId - The GUID of the preload task.
 * @returns {Promise<Object|boolean>} - Returns an object containing task execution details:
 *   - executionResultId: The ID of the execution result
 *   - taskName: The name of the preload task
 *   - executingNodeName: The name of the Qlik Sense node that executed the task
 *   - executionDetailsSorted: Array of execution step details, sorted by date
 *   - executionDetailsConcatenated: All execution details as a concatenated string
 *   - executionStatusNum: Numeric status code
 *   - executionStatusText: Human-readable status text
 *   - executionDuration: Duration of execution in hours/minutes/seconds
 *   - executionStartTime: Start timestamp in multiple formats
 *   - executionStopTime: Stop timestamp in multiple formats
 *   Returns false if an error occurs.
 */
export default async function getPreloadTaskExecutionResults(preloadTaskId) {
    const endpoint = `reloadtask/${preloadTaskId}`;
    let configQRS;

    try {
        // Set up Sense repository service configuration with certificates for authentication
        configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: globals.config.get('Butler.configQRS.port'),
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        // Merge YAML-configured headers with hardcoded headers for API requests
        configQRS.headers = {
            ...globals.getQRSHttpHeaders(),
        };

        // Create QRS API client instance
        const qrsInstance = new QrsClient(configQRS);

        globals.logger.debug(`[QSEOW] GET PRELOAD TASK EXECUTION RESULTS: preloadTaskId: ${preloadTaskId}`);

        // Query the reloadtask endpoint to get preload task details
        // Note: Using reloadtask endpoint even for preload tasks (QRS API design)
        globals.logger.verbose(`[QSEOW] GET PRELOAD TASK EXECUTION RESULTS: Calling QRS endpoint: GET /qrs/${endpoint}`);
        const result1 = await qrsInstance.Get(endpoint);

        if (!hasExpectedQrsStatus(result1) || !result1.body?.operational?.lastExecutionResult) {
            globals.logger.error(
                `[QSEOW] GET PRELOAD TASK EXECUTION RESULTS: Unexpected QRS response for task ${preloadTaskId}: ${formatQrsResultWithContext(
                    result1,
                    endpoint,
                    configQRS,
                    {
                        method: 'GET',
                        expectedStatusCodes: [200],
                    },
                )}`,
            );
            return false;
        }

        globals.logger.debug(`[QSEOW] GET PRELOAD TASK EXECUTION RESULTS: body: ${JSON.stringify(result1.body)}`);

        // Extract relevant execution information from the QRS response
        const taskInfo = {
            executionResultId: result1.body.operational.lastExecutionResult.id,
            taskName: result1.body.name,
            executingNodeName: result1.body.operational.lastExecutionResult.executingNodeName,
            executionDetailsSorted: result1.body.operational.lastExecutionResult.details.sort(compareTaskDetails),
            executionDetailsConcatenated: '',
            executionStatusNum: result1.body.operational.lastExecutionResult.status,
            executionStatusText: taskStatusLookup[result1.body.operational.lastExecutionResult.status],
        };

        // Get execution details as a single string by concatenating the individual execution step details
        // Each line contains the timestamp and message from each execution step
        for (const execDetail of taskInfo.executionDetailsSorted) {
            taskInfo.executionDetailsConcatenated = `${taskInfo.executionDetailsConcatenated + execDetail.detailCreatedDate}\t${
                execDetail.message
            }\n`;
        }

        // Calculate execution duration from the duration field (in milliseconds)
        // Convert to hours/minutes/seconds using Luxon Duration
        const taskDuration = Duration.fromMillis(result1.body.operational.lastExecutionResult.duration);
        taskInfo.executionDuration = taskDuration.shiftTo('hours', 'minutes', 'seconds').toObject();
        taskInfo.executionDuration.seconds = Math.floor(taskInfo.executionDuration.seconds);

        // Process start datetime - handle special case for SQL Server datetime minimum (1753)
        // Qlik Sense uses SQL Server datetime which has a minimum value of January 1, 1753
        if (result1.body.operational.lastExecutionResult.startTime.substring(0, 4) === '1753') {
            // Task has never been started - use placeholder values
            taskInfo.executionStartTime = {
                startTimeUTC: '-',
                startTimeLocal1: '-',
                startTimeLocal2: '-',
                startTimeLocal3: '-',
                startTimeLocal4: '-',
                startTimeLocal5: '-',
            };
        } else {
            // Parse the start time and provide in multiple formats
            const luxonDT = DateTime.fromISO(result1.body.operational.lastExecutionResult.startTime);
            taskInfo.executionStartTime = {
                startTimeUTC: result1.body.operational.lastExecutionResult.startTime,
                startTimeLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
                startTimeLocal2: luxonDT.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
                startTimeLocal3: luxonDT.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
                startTimeLocal4: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
                startTimeLocal5: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
            };
        }

        // Process stop datetime - handle special case for SQL Server datetime minimum (1753)
        if (result1.body.operational.lastExecutionResult.stopTime.substring(0, 4) === '1753') {
            // Task has not completed - use placeholder values
            taskInfo.executionStopTime = {
                stopTimeUTC: '-',
                stopTimeLocal1: '-',
                stopTimeLocal2: '-',
                stopTimeLocal3: '-',
                stopTimeLocal4: '-',
                stopTimeLocal5: '-',
            };
        } else {
            // Parse the stop time and provide in multiple formats
            const luxonDT = DateTime.fromISO(result1.body.operational.lastExecutionResult.stopTime);
            taskInfo.executionStopTime = {
                stopTimeUTC: result1.body.operational.lastExecutionResult.stopTime,
                stopTimeLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
                stopTimeLocal2: luxonDT.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
                stopTimeLocal3: luxonDT.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
                stopTimeLocal4: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
                stopTimeLocal5: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
            };
        }

        // Process each execution detail entry to add multiple timestamp formats
        taskInfo.executionDetailsSorted = taskInfo.executionDetailsSorted.map((item) => {
            // Handle SQL Server datetime minimum value (1753)
            if (item.detailCreatedDate.substring(0, 4) === '1753') {
                return {
                    timestampUTC: '-',
                    timestampLocal1: '-',
                    timestampLocal2: '-',
                    timestampLocal3: '-',
                    timestampLocal4: '-',
                    timestampLocal5: '-',
                    message: item.message,
                    detailsType: item.detailsType,
                };
            }

            // Parse timestamp and provide in multiple formats
            const luxonDT = DateTime.fromISO(item.detailCreatedDate);
            return {
                timestampUTC: item.detailCreatedDate,
                timestampLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
                timestampLocal2: luxonDT.toLocaleString(DateTime.DATETIME_SHORT_WITH_SECONDS),
                timestampLocal3: luxonDT.toLocaleString(DateTime.DATETIME_MED_WITH_SECONDS),
                timestampLocal4: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
                timestampLocal5: luxonDT.toLocaleString(DateTime.DATETIME_FULL_WITH_SECONDS),
                message: item.message,
                detailsType: item.detailsType,
            };
        });

        return taskInfo;
    } catch (err) {
        globals.logger.error(
            `[QSEOW] GET PRELOAD TASK EXECUTION RESULTS: Error getting preload task execution results for task ${preloadTaskId}: ${formatQrsErrorWithContext(
                err,
                endpoint,
                configQRS,
            )}`,
        );
        return false;
    }
}
