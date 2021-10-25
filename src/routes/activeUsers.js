const httpErrors = require('http-errors');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/logRESTCall');
const { apiGetActiveUsers } = require('../api/activeUsers');

async function handlerGetActiveUsers(request, reply) {
    try {
        logRESTCall(request);

        // Build JSON of all active users
        const activeUsers = [];
        globals.currentUsers.forEach((value, key) => {
            activeUsers.push(key);
        });

        return { response: JSON.stringify(activeUsers) };
    } catch (err) {
        globals.logger.error(
            `ACTIVEUSERCOUNT: Failed gettting active users, error is: ${JSON.stringify(err, null, 2)}`
        );
        reply.send(httpErrors(500, 'Failed gettting active users'));
        return null;
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.activeUsers') &&
        globals.config.get('Butler.restServerEndpointsEnable.activeUsers')
    ) {
        globals.logger.debug('Registering REST endpoint GET /v4/activeusers');

        fastify.get('/v4/activeusers', apiGetActiveUsers, handlerGetActiveUsers);
    }
};
