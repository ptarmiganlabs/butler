/**
 * User Sync Task Execution Results utility module.
 *
 * This module provides functions to retrieve execution results from Qlik Sense user sync tasks.
 * User sync tasks are used to synchronize user directories with Qlik Sense.
 */

import QrsClient from '../lib/qrs_client.js';
import { Duration, DateTime } from 'luxon';
import globals from '../globals.js';
import { compareTaskDetails } from './task_execution_details_sort.js';

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
 * Gets user sync task execution results from the Qlik Sense QRS API.
 * Retrieves detailed information about the last execution of a user sync task, including status, duration, and execution details.
 * @param {string} userSyncTaskId - The GUID of the user sync task.
 * @returns {Promise<Object|boolean>} - Returns an object containing task execution details (executionResultId, taskName, executingNodeName, executionDetailsSorted, executionDetailsConcatenated, executionStatusNum, executionStatusText, executionDuration, executionStartTime, executionStopTime), or false if an error occurs.
 */
export async function getUserSyncTaskExecutionResults(userSyncTaskId) {
    try {
        // Set up Sense repository service configuration
        const configQRS = {
            hostname: globals.config.get('Butler.configQRS.host'),
            portNumber: globals.config.get('Butler.configQRS.port'),
            certificates: {
                certFile: globals.configQRS.certPaths.certPath,
                keyFile: globals.configQRS.certPaths.keyPath,
            },
        };

        // Merge YAML-configured headers with hardcoded headers
        configQRS.headers = {
            ...globals.getQRSHttpHeaders(),
        };

        const qrsInstance = new QrsClient(configQRS);

        globals.logger.debug(`[QSEOW] GET USER SYNC TASK EXECUTION RESULTS: userSyncTaskId: ${userSyncTaskId}`);

        const endpoint = `usersynctask/${userSyncTaskId}`;
        globals.logger.verbose(`[QSEOW] GET USER SYNC TASK EXECUTION RESULTS: Calling QRS endpoint: GET /qrs/${endpoint}`);
        const result1 = await qrsInstance.Get(endpoint);

        globals.logger.debug(`[QSEOW] GET USER SYNC TASK EXECUTION RESULTS: body: ${JSON.stringify(result1.body)}`);

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
        for (const execDetail of taskInfo.executionDetailsSorted) {
            taskInfo.executionDetailsConcatenated = `${taskInfo.executionDetailsConcatenated + execDetail.detailCreatedDate}\t${
                execDetail.message
            }\n`;
        }

        // Add duration as JSON
        const taskDuration = Duration.fromMillis(result1.body.operational.lastExecutionResult.duration);
        taskInfo.executionDuration = taskDuration.shiftTo('hours', 'minutes', 'seconds').toObject();
        taskInfo.executionDuration.seconds = Math.floor(taskInfo.executionDuration.seconds);

        // Add start datetime in various formats
        if (result1.body.operational.lastExecutionResult.startTime.substring(0, 4) === '1753') {
            taskInfo.executionStartTime = {
                startTimeUTC: '-',
                startTimeLocal1: '-',
                startTimeLocal2: '-',
                startTimeLocal3: '-',
                startTimeLocal4: '-',
                startTimeLocal5: '-',
            };
        } else {
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

        // Add stop datetime in various formats
        if (result1.body.operational.lastExecutionResult.stopTime.substring(0, 4) === '1753') {
            taskInfo.executionStopTime = {
                stopTimeUTC: '-',
                stopTimeLocal1: '-',
                stopTimeLocal2: '-',
                stopTimeLocal3: '-',
                stopTimeLocal4: '-',
                stopTimeLocal5: '-',
            };
        } else {
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

        // Add various datetime formats to task history entries
        taskInfo.executionDetailsSorted = taskInfo.executionDetailsSorted.map((item) => {
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
        globals.logger.error(`[QSEOW] GET USER SYNC TASK EXECUTION RESULTS: ${globals.getErrorMessage(err)}`);
        return false;
    }
}

export default getUserSyncTaskExecutionResults;
