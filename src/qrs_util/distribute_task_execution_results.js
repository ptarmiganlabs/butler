/**
 * Distribute Task Execution Results utility module.
 *
 * This module provides functions to retrieve execution results from Qlik Sense distribute tasks.
 * Distribute tasks are used to copy Qlik Sense apps to target streams or spaces.
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
 * Gets distribute task execution results from the Qlik Sense QRS API.
 * Retrieves detailed information about the last execution of a distribute task, including status, duration, and execution details.
 * @param {string} distributeTaskId - The GUID of the distribute task.
 * @returns {Promise<Object|boolean>} - Returns an object containing task execution details (executionResultId, taskName, executingNodeName, executionDetailsSorted, executionDetailsConcatenated, executionStatusNum, executionStatusText, executionDuration, executionStartTime, executionStopTime), or false if an error occurs.
 */
export async function getDistributeTaskExecutionResults(distributeTaskId) {
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

        globals.logger.debug(`[QSEOW] GET DISTRIBUTE TASK EXECUTION RESULTS: distributeTaskId: ${distributeTaskId}`);

        const endpoint = `compositetask/${distributeTaskId}`;
        globals.logger.verbose(`[QSEOW] GET DISTRIBUTE TASK EXECUTION RESULTS: Calling QRS endpoint: GET /qrs/${endpoint}`);
        const result1 = await qrsInstance.Get(endpoint);

        globals.logger.debug(`[QSEOW] GET DISTRIBUTE TASK EXECUTION RESULTS: body: ${JSON.stringify(result1.body)}`);

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

        // Add start/end timestamps as JSON
        taskInfo.executionStartTime = DateTime.fromISO(result1.body.operational.lastExecutionResult.startTime).toUTC().toObject();
        taskInfo.executionStopTime = DateTime.fromISO(result1.body.operational.lastExecutionResult.stopTime).toUTC().toObject();

        return taskInfo;
    } catch (err) {
        if (err.message) {
            globals.logger.error(
                `[QSEOW] GET DISTRIBUTE TASK EXECUTION RESULTS: Error getting distribute task execution results: ${err.message}`,
            );
        } else {
            globals.logger.error(
                `[QSEOW] GET DISTRIBUTE TASK EXECUTION RESULTS: Error getting distribute task execution results: ${JSON.stringify(err, null, 2)}`,
            );
        }
        return false;
    }
}

export default getDistributeTaskExecutionResults;
