// Load global variables and functions
var globals = require('../globals');
var logRESTCall = require('../lib/logRESTCall').logRESTCall;


// Function for handling GET /schedule REST endpoint
module.exports.respondGET_schedule = function (req, res, next) {
    logRESTCall(req);

};


// Function for handling GET /schedule REST endpoint
module.exports.respondPOST_schedule = function (req, res, next) {
    logRESTCall(req);

};
