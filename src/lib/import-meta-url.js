const { createRequire } = require('node:module');
require = createRequire(__filename);

/**
 * The URL of the current module file.
 * @type {URL}
 */
export var import_meta_url = require('url').pathToFileURL(__filename);
