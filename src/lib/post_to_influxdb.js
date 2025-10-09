// This file has been refactored into smaller, more manageable modules in the ./influxdb/ directory
// This file now serves as a backward compatibility layer, re-exporting all functions from the new modules

import { postButlerMemoryUsageToInfluxdb } from './influxdb/butler_metrics.js';
import { postQlikSenseVersionToInfluxDB } from './influxdb/qlik_sense_version.js';
import {
    postQlikSenseServerLicenseStatusToInfluxDB,
    postQlikSenseLicenseStatusToInfluxDB,
    postQlikSenseLicenseReleasedToInfluxDB,
} from './influxdb/qlik_sense_license.js';
import { postWindowsServiceStatusToInfluxDB } from './influxdb/windows_service.js';
import {
    postReloadTaskSuccessNotificationInfluxDb,
    postUserSyncTaskSuccessNotificationInfluxDb,
    postExternalProgramTaskSuccessNotificationInfluxDb,
} from './influxdb/task_success.js';
import { postReloadTaskFailureNotificationInfluxDb, postExternalProgramTaskFailureNotificationInfluxDb } from './influxdb/task_failure.js';

// Re-export all functions
export {
    postButlerMemoryUsageToInfluxdb,
    postQlikSenseVersionToInfluxDB,
    postQlikSenseServerLicenseStatusToInfluxDB,
    postQlikSenseLicenseStatusToInfluxDB,
    postQlikSenseLicenseReleasedToInfluxDB,
    postWindowsServiceStatusToInfluxDB,
    postReloadTaskSuccessNotificationInfluxDb,
    postUserSyncTaskSuccessNotificationInfluxDb,
    postExternalProgramTaskSuccessNotificationInfluxDb,
    postReloadTaskFailureNotificationInfluxDb,
    postExternalProgramTaskFailureNotificationInfluxDb,
};
