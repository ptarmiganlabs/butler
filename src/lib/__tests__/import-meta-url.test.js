describe('lib/import-meta-url', () => {
    test('import_meta_url is a file URL', async () => {
        const originalRequire = globalThis.require;
        const originalFilename = globalThis.__filename;
        // Stub require to satisfy module code using CommonJS APIs in ESM
        const fakeRequire = (id) => {
            if (id === 'url') {
                return {
                    pathToFileURL: (f) => `file://${f}`,
                };
            }
            throw new Error(`Unknown module: ${id}`);
        };
        globalThis.require = (id) => {
            if (id === 'node:module') {
                return {
                    createRequire: () => fakeRequire,
                };
            }
            return fakeRequire(id);
        };

        // Provide a fake __filename used by the module
        globalThis.__filename = '/tmp/import-meta-url.js';

        const { import_meta_url } = await import('../import-meta-url.js');
        expect(import_meta_url).toBeDefined();
        expect(String(import_meta_url)).toMatch(/^file:\/\//);

        // Restore global require
        if (originalRequire === undefined) {
            delete globalThis.require;
        } else {
            globalThis.require = originalRequire;
        }
        if (originalFilename === undefined) {
            delete globalThis.__filename;
        } else {
            globalThis.__filename = originalFilename;
        }
    });
});
