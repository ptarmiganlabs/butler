// Function for handling /createDir REST endpoint
// function respondCreateDir(req, res, next) {
module.exports.respondCreateDir = function (req, res, next) {
  console.info(req.params);

  mkdirp(req.params.directory, function(err) {
    // path was created unless there was error
    console.info('created dir ' + req.params.directory);
  });

  res.send(req.params);
  next();
};
