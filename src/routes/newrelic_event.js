const httpErrors = require('http-errors');
const axios = require('axios');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/log_rest_call');
const { apiPostNewRelicEvent } = require('../api/newrelic_event');

// eslint-disable-next-line consistent-return
async function handlerPostNewRelicEvent(request, reply) {
    try {
        logRESTCall(request);

        let payload = [];
        const attributes = {};
        const ts = new Date().getTime(); // Timestamp in millisec

        // TODO sanity check parameters in REST call

        // Add static fields to attributes
        if (globals.config.has('Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.attribute.static')) {
            const staticAttributes = globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.attribute.static');

            if (staticAttributes !== null && staticAttributes.length > 0) {
                // eslint-disable-next-line no-restricted-syntax
                for (const item of staticAttributes) {
                    attributes[item.name] = item.value;
                }
            }
        }

        // Add attributes passed as parameters
        if (request.body.attributes && request.body.attributes.length > 0) {
            if (request.body.attributes !== null && typeof request.body.attributes === 'object') {
                // eslint-disable-next-line no-restricted-syntax
                for (const item of request.body.attributes) {
                    attributes[item.name] = item.value;
                }
            }
        }

        const tsEvent = request.body.timestamp > 0 ? request.body.timestamp : ts;

        const event = {
            timestamp: tsEvent,
            eventType: request.body.eventType,
        };

        Object.assign(event, attributes);

        // Build final payload
        payload = event;

        globals.logger.debug(`NEWRELIC EVENT: Payload: ${JSON.stringify(payload, null, 2)}`);

        // Preapare call to remote host

        // Build final URL
        const remoteUrl =
            globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.url').slice(-1) === '/'
                ? globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.url')
                : `${globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.url')}/`;

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
        };

        if (globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.header') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const header of globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.header')) {
                headers[header.name] = header.value;
            }
        }

        //
        // Send data to all New Relic accounts that are enabled for this metric/event
        //
        // Get New Relic accounts
        const nrAccounts = globals.config.Butler.thirdPartyToolsCredentials.newRelic;

        // eslint-disable-next-line no-restricted-syntax
        for (const accountName of globals.config.Butler.restServerEndpointsConfig.newRelic.postNewRelicEvent.destinationAccount) {
            globals.logger.debug(`NEWRELIC EVENT: Current loop New Relic config=${JSON.stringify(accountName)}`);

            // Is there any config available for the current account?
            const newRelicConfig = nrAccounts.filter((item) => item.accountName === accountName);
            if (newRelicConfig.length === 0) {
                globals.logger.error(`NEWRELIC EVENT: New Relic config "${accountName}" does not exist in the Butler config file.`);
            } else {
                headers['Api-Key'] = newRelicConfig[0].insertApiKey;
                const newRelicAccountId = newRelicConfig[0].accountId;

                const eventApiUrl = `${remoteUrl}v1/accounts/${newRelicAccountId}/events`;

                // Build body for HTTP POST
                const axiosRequest = {
                    url: eventApiUrl,
                    method: 'post',
                    timeout: 5000,
                    data: event,
                    headers,
                };

                // eslint-disable-next-line no-await-in-loop
                const res = await axios.request(axiosRequest);
                globals.logger.debug(
                    `NEWRELIC EVENT: Result code from posting event to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`
                );

                if (res.status === 200 || res.status === 202) {
                    // Posting done without error
                    globals.logger.verbose(`NEWRELIC EVENT: Sent event New Relic account ${newRelicConfig[0].accountId}`);
                    reply.type('text/plain').code(202).send(res.statusText);
                    // reply.type('application/json; charset=utf-8').code(201).send(JSON.stringify(request.body));
                } else {
                    reply.send(httpErrors(res.status, `Failed posting event to New Relic: ${res.statusText}`));
                }
            }
        }
    } catch (err) {
        globals.logger.error(
            `NEWRELIC EVENT: Failed posting event to New Relic: ${JSON.stringify(request.body, null, 2)}, error is: ${JSON.stringify(
                err,
                null,
                2
            )}`
        );
        reply.send(httpErrors(500, 'Failed posting event to New Relic'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.newRelic.postNewRelicEvent') &&
        globals.config.get('Butler.restServerEndpointsEnable.newRelic.postNewRelicEvent') === true
    ) {
        globals.logger.debug('Registering REST endpoint POST /v4/newrelic/event');
        fastify.post('/v4/newrelic/event', apiPostNewRelicEvent, handlerPostNewRelicEvent);
    }
};
