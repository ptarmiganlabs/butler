// Load global variables and functions
import globals from '../globals.js';

/**
 * Log information about a REST API call.
 *
 * Logs the URL, remote IP address, query parameters, request body,
 * path parameters, and headers for debugging purposes.
 *
 * @param {Object} req - The Fastify request object.
 */
export const logRESTCall = (req) => {
    // Log the main URL and source IP at info level
    globals.logger.info(`${req.url} called from ${req.headers.remoteip}`);

    // Log detailed request information at debug level
    globals.logger.debug(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.debug(`Body: ${JSON.stringify(req.body, null, 2)}`);
    globals.logger.debug(`Params: ${JSON.stringify(req.params, null, 2)}`);
    globals.logger.debug(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
};

export default logRESTCall;
