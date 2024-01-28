// Load global variables and functions
import globals from '../globals.js';

// Function for logging info about REST call
export const logRESTCall = (req) => {
    globals.logger.info(`${req.url} called from ${req.headers.remoteip}`);
    globals.logger.debug(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.debug(`Body: ${JSON.stringify(req.body, null, 2)}`);
    globals.logger.debug(`Params: ${JSON.stringify(req.params, null, 2)}`);
    globals.logger.debug(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
};

export default logRESTCall;
