const { createRequire } = require('node:module');
require = createRequire(__filename);
export var import_meta_url = require('url').pathToFileURL(__filename);
