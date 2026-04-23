/**
 * Qlik Sense URL utility functions.
 *
 * This module provides functions to retrieve Qlik Sense URLs from the Butler
 * configuration, including the QMC, Hub, and app base URLs.
 */

import globals from '../../globals.js';

/**
 * Gets the Qlik Sense URLs from the configuration.
 *
 * Retrieves the QMC, Hub, and app base URLs from the Butler config file.
 * These URLs are used throughout Butler for linking to Qlik Sense resources.
 *
 * @returns {Object} - Returns an object containing:
 *   - qmcUrl: URL to the Qlik Management Console
 *   - hubUrl: URL to the Qlik Sense Hub
 *   - appBaseUrl: Base URL for Qlik Sense apps
 */
export function getQlikSenseUrls() {
    // Retrieve URLs from Butler configuration
    const qmcUrl = globals.config.get('Butler.qlikSenseUrls.qmc');
    const hubUrl = globals.config.get('Butler.qlikSenseUrls.hub');
    const appBaseUrl = globals.config.get('Butler.qlikSenseUrls.appBaseUrl');

    return { qmcUrl, hubUrl, appBaseUrl };
}
