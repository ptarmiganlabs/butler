// Central export file for all InfluxDB-related functions
// This provides backward compatibility for imports from the original post_to_influxdb.js

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
