import axios from 'axios';
import https from 'https';
import globals from '../globals.js';

/**
 * QRS Client using Axios to replace qrs-interact functionality
 * Maintains the same API as qrs-interact for drop-in replacement
 */
class QrsClient {
    constructor(config = {}) {
        // Use provided config or fall back to globals
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

        // Build base URL
        const protocol = this.config.useSSL ? 'https' : 'http';
        this.baseURL = `${protocol}://${this.config.hostname}:${this.config.portNumber}/qrs/`;

        // Create HTTPS agent if using SSL
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

        // Create axios instance
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'x-qlik-xrfkey': 'abcdefghijklmnop',
                ...this.config.headers,
            },
            httpsAgent,
            // Add xrfkey parameter to all requests
            params: {
                xrfkey: 'abcdefghijklmnop',
            },
        });
    }

    /**
     * GET request to QRS API
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
                // Network error or other issue
                throw error;
            }
        }
    }

    /**
     * POST request to QRS API
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
                // Network error or other issue
                throw error;
            }
        }
    }

    /**
     * PUT request to QRS API
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
                // Network error or other issue
                throw error;
            }
        }
    }

    /**
     * DELETE request to QRS API
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
                // Network error or other issue
                throw error;
            }
        }
    }
}

export default QrsClient;
