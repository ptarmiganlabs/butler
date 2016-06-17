// Function for handling /getDiskSpace REST endpoint
// function respondGetDiskSpace(req, res, next) {
module.exports.respondGetDiskSpace = function (req, res, next) {
  console.info(req.params);

  // Windows: get disk usage. Takes path as first parameter
  disk.check(req.params.path, function(err, info) {
    console.info(info);
    req.params.available = info.available;
    req.params.free = info.free;
    req.params.total = info.total;
  });

  res.send(req.params);
  next();
};

/*
   OSX/Linux: get disk usage. Takes mount point as first parameter
  disk.check(req.params.path, function(err, info) {
    req.params.available = info.available;
    req.params.free = info.free;
    req.params.total = info.total;
  });
*/
