// Function for handling /butlerPing REST endpoint
module.exports.respondButlerPing = function (req, res, next) {
    req.params.response = 'Butler reporting for duty';

    res.send(req.params);
    next();
};
