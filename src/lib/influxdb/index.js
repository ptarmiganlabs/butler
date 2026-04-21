/**
 * Central export file for all InfluxDB-related functions.
 *
 * Provides backward compatibility for imports from the original post_to_influxdb.js
 * by re-exporting all sensor/metric/task notification functions from their
 * respective modules.
 */

export { postButlerMemoryUsageToInfluxdb } from './butler_metrics.js';
export { postQlikSenseVersionToInfluxDB } from './qlik_sense_version.js';
export {
    postQlikSenseServerLicenseStatusToInfluxDB,
    postQlikSenseLicenseStatusToInfluxDB,
    postQlikSenseLicenseReleasedToInfluxDB,
} from './qlik_sense_license.js';
export { postWindowsServiceStatusToInfluxDB } from './windows_service.js';
export {
    postReloadTaskSuccessNotificationInfluxDb,
    postUserSyncTaskSuccessNotificationInfluxDb,
    postExternalProgramTaskSuccessNotificationInfluxDb,
} from './task_success.js';
export { postReloadTaskFailureNotificationInfluxDb } from './task_failure.js';
