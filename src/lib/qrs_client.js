import axios from 'axios';
import https from 'https';
import globals from '../globals.js';
import { HTTP_TIMEOUT_MS } from '../constants.js';

/**
 * QRS Client using Axios to replace qrs-interact functionality.
 *
 * Provides a simplified interface to the Qlik Sense Repository Service (QRS) API.
 * Maintains the same API as qrs-interact for drop-in replacement.
 *
 * The client handles:
 * - SSL/TLS with client certificates
 * - XSRF protection via xrfkey parameter
 * - HTTP timeout configuration
 * - Error handling that maintains compatibility with qrs-interact
 */
class QrsClient {
    /**
     * Creates a new QRS API client instance.
     * @param {Object} config - Configuration options (uses globals as fallback)
     */
    constructor(config = {}) {
        // Use provided config or fall back to globals from Butler configuration
        this.config = {
            hostname: config.hostname || globals.config.get('Butler.configQRS.host'),
            portNumber: config.portNumber || globals.config.get('Butler.configQRS.port'),
            useSSL: config.useSSL !== undefined ? config.useSSL : globals.config.get('Butler.configQRS.useSSL'),
            rejectUnauthorized:
                config.rejectUnauthorized !== undefined
                    ? config.rejectUnauthorized
                    : globals.config.get('Butler.configQRS.rejectUnauthorized'),
            headers: config.headers || {},
            certificates: config.certificates || {
                certFile: globals.configQRS?.certPaths?.certPath,
                keyFile: globals.configQRS?.certPaths?.keyPath,
            },
        };

        // Build base URL for QRS API (e.g., https://server:4242/qrs/)
        const protocol = this.config.useSSL ? 'https' : 'http';
        this.baseURL = `${protocol}://${this.config.hostname}:${this.config.portNumber}/qrs/`;

        // Create HTTPS agent with client certificates if using SSL
        let httpsAgent;
        if (this.config.useSSL) {
            const agentConfig = {
                rejectUnauthorized: this.config.rejectUnauthorized,
            };

            // Add certificates if available
            if (this.config.certificates?.certFile && this.config.certificates?.keyFile) {
                if (globals.configQRS?.cert && globals.configQRS?.key) {
                    agentConfig.cert = globals.configQRS.cert;
                    agentConfig.key = globals.configQRS.key;
                }
                if (globals.configQRS?.ca) {
                    agentConfig.ca = globals.configQRS.ca;
                }
            }

            httpsAgent = new https.Agent(agentConfig);
        }

        // Generate random xrfkey for XSRF protection (required by Qlik Sense QRS API)
        const xrfkey = this.generateXrfKey();

        // Create axios instance with base configuration
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: HTTP_TIMEOUT_MS,
            headers: {
                'Content-Type': 'application/json',
                'x-qlik-xrfkey': xrfkey,
                ...this.config.headers,
            },
            httpsAgent,
            // Add xrfkey parameter to all requests (XSRF protection)
            params: {
                xrfkey: xrfkey,
            },
        });
    }

    /**
     * Generate a random 16-character string for xrfkey (XSRF protection).
     * @private
     * @returns {string} Random 16-character string
     */
    generateXrfKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 16; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * GET request to QRS API.
     * @param {string} endpoint - The API endpoint (without /qrs/ prefix)
     * @returns {Promise<Object>} Response object with statusCode and body properties
     */
    async Get(endpoint) {
        try {
            const response = await this.axiosInstance.get(endpoint);
            return {
                statusCode: response.status,
                body: response.data,
            };
        } catch (error) {
            // Handle axios errors and maintain qrs-interact error format
            if (error.response) {
                // Server responded with error status
                return {
                    statusCode: error.response.status,
                    body: error.response.data,
                };
            } else {
                // Network error or other issue - re-throw
                throw error;
            }
        }
    }

    /**
     * POST request to QRS API.
     * @param {string} endpoint - The API endpoint (without /qrs/ prefix)
     * @param {Object} data - Data to send in the request body
     * @returns {Promise<Object>} Response object with statusCode and body properties
     */
    async Post(endpoint, data = {}) {
        try {
            const response = await this.axiosInstance.post(endpoint, data);
            return {
                statusCode: response.status,
                body: response.data,
            };
        } catch (error) {
            // Handle axios errors and maintain qrs-interact error format
            if (error.response) {
                // Server responded with error status
                return {
                    statusCode: error.response.status,
                    body: error.response.data,
                };
            } else {
                // Network error or other issue - re-throw
                throw error;
            }
        }
    }

    /**
     * PUT request to QRS API.
     * @param {string} endpoint - The API endpoint (without /qrs/ prefix)
     * @param {Object} data - Data to send in the request body
     * @returns {Promise<Object>} Response object with statusCode and body properties
     */
    async Put(endpoint, data = {}) {
        try {
            const response = await this.axiosInstance.put(endpoint, data);
            return {
                statusCode: response.status,
                body: response.data,
            };
        } catch (error) {
            // Handle axios errors and maintain qrs-interact error format
            if (error.response) {
                // Server responded with error status
                return {
                    statusCode: error.response.status,
                    body: error.response.data,
                };
            } else {
                // Network error or other issue - re-throw
                throw error;
            }
        }
    }

    /**
     * DELETE request to QRS API.
     * @param {string} endpoint - The API endpoint (without /qrs/ prefix)
     * @returns {Promise<Object>} Response object with statusCode and body properties
     */
    async Delete(endpoint) {
        try {
            const response = await this.axiosInstance.delete(endpoint);
            return {
                statusCode: response.status,
                body: response.data,
            };
        } catch (error) {
            // Handle axios errors and maintain qrs-interact error format
            if (error.response) {
                // Server responded with error status
                return {
                    statusCode: error.response.status,
                    body: error.response.data,
                };
            } else {
                // Network error or other issue - re-throw
                throw error;
            }
        }
    }
}

export default QrsClient;
