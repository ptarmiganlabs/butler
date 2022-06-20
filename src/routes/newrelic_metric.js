const httpErrors = require('http-errors');
const axios = require('axios');

// Load global variables and functions
const globals = require('../globals');
const { logRESTCall } = require('../lib/log_rest_call');
const { apiPostNewRelicMetric } = require('../api/newrelic_metric');

// eslint-disable-next-line consistent-return
async function handlerPostNewRelicMetric(request, reply) {
    try {
        logRESTCall(request);

        const payload = [];
        const metrics = [];
        const attributes = {};
        const ts = new Date().getTime(); // Timestamp in millisec

        // TODO sanity check parameters in REST call

        // Add static fields to attributes
        if (globals.config.has('Butler.restServerEndpointsConfig.newRelic.postNewRelicMetric.attribute.static')) {
            const staticAttributes = globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicMetric.attribute.static');

            if (staticAttributes !== null && staticAttributes.length > 0) {
                // eslint-disable-next-line no-restricted-syntax
                for (const item of staticAttributes) {
                    attributes[item.name] = item.value;
                }
            }
        }

        // Add attributes passed as parameters
        if (request.body.attributes && request.body.attributes.length > 0) {
            // eslint-disable-next-line no-restricted-syntax
            for (const item of request.body.attributes) {
                attributes[item.name] = item.value;
            }
        }

        // Build New Relic metric common block
        const common = {
            timestamp: request.body.timestamp > 0 ? request.body.timestamp : ts,
            attributes,
        };

        // Interval is required for metric types "count" and "summary"
        if (request.body.type.toLowerCase() === 'count' || request.body.type.toLowerCase() === 'summary') {
            common['interval.ms'] = request.body.interval;
        }

        metrics.push({
            name: request.body.name,
            type: request.body.type,
            value: request.body.value,
        });

        // Build final payload
        payload.push({
            common,
            metrics,
        });

        globals.logger.debug(`NEWRELIC METRIC: Payload: ${JSON.stringify(payload, null, 2)}`);

        // Preapare call to remote host
        const remoteUrl = globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicMetric.url');

        // Add headers
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
        };

        if (globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicMetric.header') !== null) {
            // eslint-disable-next-line no-restricted-syntax
            for (const header of globals.config.get('Butler.restServerEndpointsConfig.newRelic.postNewRelicMetric.header')) {
                headers[header.name] = header.value;
            }
        }

        //
        // Send data to all New Relic accounts that are enabled for this metric/event
        //
        // Get New Relic accounts
        const nrAccounts = globals.config.Butler.thirdPartyToolsCredentials.newRelic;

        // eslint-disable-next-line no-restricted-syntax
        for (const accountName of globals.config.Butler.restServerEndpointsConfig.newRelic.postNewRelicMetric.destinationAccount) {
            globals.logger.debug(`NEWRELIC METRIC: Current loop New Relic config=${JSON.stringify(accountName)}`);

            // Is there any config available for the current account?
            const newRelicConfig = nrAccounts.filter((item) => item.accountName === accountName);
            if (newRelicConfig.length === 0) {
                globals.logger.error(`NEWRELIC METRIC: New Relic config "${accountName}" does not exist in the Butler config file.`);
            } else {
                headers['Api-Key'] = newRelicConfig[0].insertApiKey;

                // eslint-disable-next-line no-await-in-loop
                const res = await axios.post(remoteUrl, payload, { headers, timeout: 5000 });
                globals.logger.debug(
                    `NEWRELIC METRIC: Result code from posting metric to New Relic account ${newRelicConfig[0].accountId}: ${res.status}, ${res.statusText}`
                );

                if (res.status === 202) {
                    // Posting done without error
                    globals.logger.verbose(`NEWRELIC METRIC: Sent metric New Relic account ${newRelicConfig[0].accountId}`);
                    reply.type('text/plain').code(202).send(res.statusText);
                    // reply.type('application/json; charset=utf-8').code(201).send(JSON.stringify(request.body));
                } else {
                    reply.send(httpErrors(res.status, `Failed posting metric to New Relic: ${res.statusText}`));
                }
            }
        }
        // Required parameter is missing
        // reply.send(httpErrors(400, 'Required parameter missing'));
    } catch (err) {
        globals.logger.error(
            `NEWRELIC METRIC: Failed posting metric to New Relic: ${JSON.stringify(request.body, null, 2)}, error is: ${JSON.stringify(
                err,
                null,
                2
            )}`
        );
        reply.send(httpErrors(500, 'Failed posting metric to New Relic'));
    }
}

// eslint-disable-next-line no-unused-vars
module.exports = async (fastify, options) => {
    if (
        globals.config.has('Butler.restServerEndpointsEnable.newRelic.postNewRelicMetric') &&
        globals.config.get('Butler.restServerEndpointsEnable.newRelic.postNewRelicMetric') === true
    ) {
        globals.logger.debug('Registering REST endpoint POST /v4/newrelic/metric');
        fastify.post('/v4/newrelic/metric', apiPostNewRelicMetric, handlerPostNewRelicMetric);
    }
};
