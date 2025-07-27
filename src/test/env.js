import path from 'path';

const configDir = path.resolve('./src/config/');

process.env.NODE_CONFIG_DIR = configDir;
process.env.NODE_ENV = 'production';
process.env.SUPPRESS_NO_CONFIG_WARNING = 'true';
