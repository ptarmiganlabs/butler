// Load global variables and functions
var globals = require('../globals');

var anyBase = require('any-base'),
    base62_to_Hex = anyBase('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', '0123456789abcdef'),
    hex_to_base62 = anyBase('0123456789abcdef', '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

// Conversion base62 to base16
module.exports.respondBase62ToBase16 = function (req, res, next) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    var base16 = base62_to_Hex(req.query.base62);

    res.send(base16);
    next();
};

// Conversion base16 to base62
module.exports.respondBase16ToBase62 = function (req, res, next) {
    globals.logger.info(`${req.url} called from ${req.client.remoteAddress}`);
    globals.logger.verbose(`Query: ${JSON.stringify(req.query, null, 2)}`);
    globals.logger.verbose(`Headers: ${JSON.stringify(req.headers, null, 2)}`);

    var base62 = hex_to_base62(req.query.base16);

    res.send(base62);
    next();
};
