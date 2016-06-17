// Function for handling /butlerPing REST endpoint
//function respondButlerPing(req, res, next) {
module.exports.respondButlerPing = function (req, res, next) {
  console.info(req.params);

  // TODO: Implement Butler ping response

  res.send(req.params);
  next();
};
