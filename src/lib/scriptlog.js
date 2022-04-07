const QrsInteract = require('qrs-interact');
const axios = require('axios');
const https = require('https');
const luxon = require('luxon');
const path = require('path');
const fs = require('fs');

const globals = require('../globals');

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

function compareTaskDetails(a, b) {
    if (a.detailCreatedDate < b.detailCreatedDate) {
        return -1;
    }
    if (a.detailCreatedDate > b.detailCreatedDate) {
        return 1;
    }
    return 0;
}

function getScriptLog(reloadTaskId, headLineCount, tailLineCount) {
    return new Promise((resolve, reject) => {
        try {
            // Set up Sense repository service configuration
            const configQRS = {
                hostname: globals.config.get('Butler.configQRS.host'),
                portNumber: 4242,
                certificates: {
                    certFile: globals.configQRS.certPaths.certPath,
                    keyFile: globals.configQRS.certPaths.keyPath,
                },
            };

            configQRS.headers = {
                'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
            };

            const qrsInstance = new QrsInteract(configQRS);

            // Step 1
            globals.logger.debug(`GETSCRIPTLOG 1: reloadTaskId: ${reloadTaskId}`);
            qrsInstance.Get(`reloadtask/${reloadTaskId}`).then((result1) => {
                const taskInfo = {
                    fileReferenceId: result1.body.operational.lastExecutionResult.fileReferenceID,
                    executingNodeName: result1.body.operational.lastExecutionResult.executingNodeName,
                    executionDetailsSorted:
                        result1.body.operational.lastExecutionResult.details.sort(compareTaskDetails),
                    executionDetailsConcatenated: '',
                    executionStatusNum: result1.body.operational.lastExecutionResult.status,
                    executionStatusText: taskStatusLookup[result1.body.operational.lastExecutionResult.status],
                    // scriptLogAvailable = result1.body.operational.lastExecutionResult.scriptLogAvailable,
                    scriptLogSize: result1.body.operational.lastExecutionResult.scriptLogSize,
                };

                // Get execution details as a single string ny concatenating the individual execution step details
                // eslint-disable-next-line no-restricted-syntax
                for (const execDetail of taskInfo.executionDetailsSorted) {
                    taskInfo.executionDetailsConcatenated = `${
                        taskInfo.executionDetailsConcatenated + execDetail.detailCreatedDate
                    }\t${execDetail.message}\n`;
                }

                // Add duration as JSON
                const taskDuration = luxon.Duration.fromMillis(result1.body.operational.lastExecutionResult.duration);
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
                    const luxonDT = luxon.DateTime.fromISO(result1.body.operational.lastExecutionResult.startTime);
                    taskInfo.executionStartTime = {
                        startTimeUTC: result1.body.operational.lastExecutionResult.startTime,
                        startTimeLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
                        startTimeLocal2: luxonDT.toLocaleString(luxon.DateTime.DATETIME_SHORT_WITH_SECONDS),
                        startTimeLocal3: luxonDT.toLocaleString(luxon.DateTime.DATETIME_MED_WITH_SECONDS),
                        startTimeLocal4: luxonDT.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS),
                        startTimeLocal5: luxonDT.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS),
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
                    const luxonDT = luxon.DateTime.fromISO(result1.body.operational.lastExecutionResult.stopTime);
                    taskInfo.executionStopTime = {
                        stopTimeUTC: result1.body.operational.lastExecutionResult.stopTime,
                        stopTimeLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
                        stopTimeLocal2: luxonDT.toLocaleString(luxon.DateTime.DATETIME_SHORT_WITH_SECONDS),
                        stopTimeLocal3: luxonDT.toLocaleString(luxon.DateTime.DATETIME_MED_WITH_SECONDS),
                        stopTimeLocal4: luxonDT.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS),
                        stopTimeLocal5: luxonDT.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS),
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

                    const luxonDT = luxon.DateTime.fromISO(item.detailCreatedDate);
                    return {
                        timestampUTC: item.detailCreatedDate,
                        timestampLocal1: luxonDT.toFormat('yyyy-LL-dd HH:mm:ss'),
                        timestampLocal2: luxonDT.toLocaleString(luxon.DateTime.DATETIME_SHORT_WITH_SECONDS),
                        timestampLocal3: luxonDT.toLocaleString(luxon.DateTime.DATETIME_MED_WITH_SECONDS),
                        timestampLocal4: luxonDT.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS),
                        timestampLocal5: luxonDT.toLocaleString(luxon.DateTime.DATETIME_FULL_WITH_SECONDS),
                        message: item.message,
                        detailsType: item.detailsType,
                    };
                });

                // Step 2
                // Only get script log if there is a valid fileReferenceId
                globals.logger.debug(`GETSCRIPTLOG 2: taskInfo.fileReferenceId: ${taskInfo.fileReferenceId}`);
                if (taskInfo.fileReferenceId !== '00000000-0000-0000-0000-000000000000') {
                    globals.logger.debug(
                        `GETSCRIPTLOG 3: reloadtask/${reloadTaskId}/scriptlog?fileReferenceId=${taskInfo.fileReferenceId}`
                    );
                    qrsInstance
                        .Get(`reloadtask/${reloadTaskId}/scriptlog?fileReferenceId=${taskInfo.fileReferenceId}`)
                        .then((result2) => {
                            // Step 3
                            // Use Axios for final call to QRS, as QRS-Interact has a bug that prevents downloading of script logs
                            const httpsAgent = new https.Agent({
                                rejectUnauthorized: globals.config.get('Butler.configQRS.rejectUnauthorized'),
                                cert: globals.configQRS.cert,
                                key: globals.configQRS.key,
                            });

                            const axiosConfig = {
                                url: `/qrs/download/reloadtask/${result2.body.value}/scriptlog.txt?xrfkey=abcdefghijklmnop`,
                                method: 'get',
                                baseURL: `https://${globals.configQRS.host}:${globals.configQRS.port}`,
                                headers: {
                                    'x-qlik-xrfkey': 'abcdefghijklmnop',
                                    'X-Qlik-User': 'UserDirectory=Internal; UserId=sa_repository',
                                },
                                responseType: 'text',
                                httpsAgent,
                                //   passphrase: "YYY"
                            };

                            axios
                                .request(axiosConfig)
                                .then((result3) => {
                                    const scriptLogFull = result3.data.split('\r\n');

                                    let scriptLogHead = '';
                                    let scriptLogTail = '';

                                    if (headLineCount > 0) {
                                        scriptLogHead = scriptLogFull.slice(0, headLineCount).join('\r\n');
                                    }

                                    if (tailLineCount > 0) {
                                        scriptLogTail = scriptLogFull
                                            .slice(Math.max(scriptLogFull.length - tailLineCount, 0))
                                            .join('\r\n');
                                    }

                                    globals.logger.debug(`SCRIPTLOG: Script log head:\n${scriptLogHead}`);
                                    globals.logger.debug(`SCRIPTLOG: Script log tails:\n${scriptLogTail}`);

                                    globals.logger.verbose('SCRIPTLOG: Done getting script log');

                                    resolve({
                                        executingNodeName: taskInfo.executingNodeName,
                                        executionDetails: taskInfo.executionDetailsSorted,
                                        executionDetailsConcatenated: taskInfo.executionDetailsConcatenated,
                                        executionDuration: taskInfo.executionDuration,
                                        executionStartTime: taskInfo.executionStartTime,
                                        executionStopTime: taskInfo.executionStopTime,
                                        executionStatusNum: taskInfo.executionStatusNum,
                                        executionStatusText: taskInfo.executionStatusText,
                                        scriptLogFull,
                                        scriptLogSize: taskInfo.scriptLogSize,
                                        scriptLogHead,
                                        scriptLogHeadCount: headLineCount,
                                        scriptLogTail,
                                        scriptLogTailCount: tailLineCount,
                                    });
                                })
                                .catch((err) => {
                                    globals.logger.error(`SCRIPTLOG ERROR: ${err}`);
                                });
                        });
                } else {
                    // No script log is available
                    resolve({
                        executingNodeName: taskInfo.executingNodeName,
                        executionDetails: taskInfo.executionDetailsSorted,
                        executionDetailsConcatenated: taskInfo.executionDetailsConcatenated,
                        executionDuration: taskInfo.executionDuration,
                        executionStartTime: taskInfo.executionStartTime,
                        executionStopTime: taskInfo.executionStopTime,
                        executionStatusNum: taskInfo.executionStatusNum,
                        executionStatusText: taskInfo.executionStatusText,
                        scriptLogFull: '',
                        scriptLogSize: 0,
                        scriptLogHead: '',
                        scriptLogHeadCount: 0,
                        scriptLogTail: '',
                        scriptLogTailCount: 0,
                    });
                }
            });
        } catch (err) {
            globals.logger.error(`SCRIPTLOG: ${err}`);
            reject();
        }
    });
}

async function failedTaskStoreLogOnDisk(reloadParams) {
    try {
        // Get top level directory where logs should be stored
        const reloadLogDirRoot = globals.config.get('Butler.scriptLog.storeOnDisk.reloadTaskFailure.logDirectory');

        // Get misc script log info
        const scriptLog = await getScriptLog(reloadParams.taskId, 1, 1);

        // Create directory for script log, if needed
        const logDate = reloadParams.logTimeStamp.slice(0, 10);
        const reloadLogDir = path.resolve(reloadLogDirRoot, logDate);

        globals.logger.debug(`SCRIPTLOG STORE: Creating directory for failed task script log: ${reloadLogDir}`);
        fs.mkdirSync(reloadLogDir, { recursive: true });

        const fileName = path.resolve(
            reloadLogDir,
            `${reloadParams.logTimeStamp.slice(0, 19).replace(/ /g, '_').replace(/:/g, '-')}_appId=${
                reloadParams.appId
            }_taskId=${reloadParams.taskId}.log`
        );

        globals.logger.info(`SCRIPTLOG STORE: Writing failed task script log: ${fileName}`);
        fs.writeFileSync(fileName, scriptLog.scriptLogFull.join('\n'));
        return true;
    } catch (err) {
        globals.logger.error(`SCRIPTLOG STORE: ${err}`);
        return false;
    }
}

module.exports = {
    getScriptLog,
    failedTaskStoreLogOnDisk,
};
