/**
 * The macOS scripts, run where they can be: against stand-ins for Apple's tools
 * and the build, in a copy of the scripts.
 *
 *   npm run test:release-kit
 *
 * scripts/release-macos.sh and its keychain library run for real only in a
 * release, or a rehearsal, holding the Developer ID. So a fault in their
 * refusals or their teardown used to be found there, or not at all. Here they
 * run under /bin/bash with security, codesign, xcrun, zip and the build's tools
 * replaced by scripts/test/apple-stand-ins/, which log what they are asked and
 * do the least the scripts need. The release-kit workflow runs this on macos-15,
 * under the /bin/bash 3.2 the release job runs the scripts with. What the
 * stand-ins cannot show is Apple's side, a real signature and a real
 * notarization, which only a release or a rehearsal exercises.
 *
 * Nothing here reaches the real security: the stand-ins come first on PATH,
 * which is checked before anything runs, HOME is a folder of the test's own,
 * and the scripts run from a copy.
 *
 * The Windows release cannot run here at all. What is held below is its
 * wiring in ci.yaml: build, sign and publish in three jobs, the signing job
 * running nothing from the repository, and the publish step refusing a binary
 * sign-win64 did not verify. release-kit.yaml builds the unsigned binary on
 * windows-latest with scripts/release-win.ps1.
 *
 * Not a Jest suite: Jest's rootDir is src/. node:test, which needs nothing.
 */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { load } from 'js-yaml';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const STAND_INS = path.join(ROOT, 'scripts', 'test', 'apple-stand-ins');
/** What the release job runs the scripts with; on macOS it is bash 3.2. */
const BASH = '/bin/bash';
const skip = process.platform === 'win32' ? 'the signing scripts are bash, and run on a Mac' : false;
// The insiders script stamps package.json with BSD sed's `-i ''`, which GNU sed reads otherwise.
const skipInsiders = process.platform === 'darwin' ? false : 'the insiders script uses BSD sed, and runs on a Mac';

const IDENTITY = 'Developer ID Application: Somebody (TEAMID)';
const APP_PASSWORD = 'app-specific-password';
const SECRETS = {
    MACOS_CERTIFICATE: Buffer.from('not a certificate').toString('base64'),
    MACOS_CERTIFICATE_PWD: 'p12-password',
    MACOS_CERTIFICATE_NAME: IDENTITY,
    PROD_MACOS_NOTARIZATION_APPLE_ID: 'somebody@example.com',
    PROD_MACOS_NOTARIZATION_TEAM_ID: 'TEAMID',
    PROD_MACOS_NOTARIZATION_PWD: APP_PASSWORD,
};

/**
 * @typedef {object} Kit
 * @property {string} root        the repository folder the scripts run in, a copy
 * @property {string} release     its scripts/release-macos.sh
 * @property {string} insider     its scripts/insider-build-mac.sh
 * @property {string} home        HOME, the user's home folder
 * @property {string} log         what the stand-ins were asked, one line a call
 * @property {string} searchList  the keychain search list the stand-in keeps
 * @property {string} keychains   the folder of the user's keychains
 * @property {string} runnerTemp  RUNNER_TEMP, where the signing keychain goes
 * @property {NodeJS.ProcessEnv} env
 */

/**
 * A copy of the scripts and what they read, a user whose keychain search list
 * holds `keychains` in that order, and the stand-ins first on PATH.
 *
 * @param {import('node:test').TestContext} t
 * @param {object} [options]
 * @param {string[]} [options.keychains]  file names in the user's keychain folder, the search list in order
 * @param {string} [options.certificate]  MACOS_CERTIFICATE, base64
 * @returns {Promise<Kit>}
 */
async function kit(t, { keychains = ['login.keychain-db'], certificate = SECRETS.MACOS_CERTIFICATE } = {}) {
    const dir = await mkdtemp(path.join(tmpdir(), 'butler-release-kit-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const root = path.join(dir, 'repository');
    for (const rel of [
        'scripts/release-macos.sh',
        'scripts/insider-build-mac.sh',
        'scripts/lib/macos-signing-keychain.sh',
        'release-config',
        'package.json',
    ]) {
        await cp(path.join(ROOT, rel), path.join(root, rel), { recursive: true });
    }
    await mkdir(path.join(root, 'src'));
    await mkdir(path.join(root, 'node_modules', '.bin'), { recursive: true });
    await cp(path.join(STAND_INS, 'esbuild'), path.join(root, 'node_modules', '.bin', 'esbuild'));

    const home = path.join(dir, 'home');
    const keychainFolder = path.join(home, 'Library', 'Keychains');
    await mkdir(keychainFolder, { recursive: true });
    await writeFile(path.join(keychainFolder, 'login.keychain-db'), '');
    for (const name of keychains) await writeFile(path.join(keychainFolder, name), '');
    const searchList = path.join(dir, 'search-list');
    await writeFile(searchList, keychains.map((name) => `${path.join(keychainFolder, name)}\n`).join(''));

    const runnerTemp = path.join(dir, 'runner-temp');
    await mkdir(runnerTemp);
    const log = path.join(dir, 'log');
    await writeFile(log, '');

    return {
        root,
        release: path.join(root, 'scripts', 'release-macos.sh'),
        insider: path.join(root, 'scripts', 'insider-build-mac.sh'),
        home,
        log,
        searchList,
        keychains: keychainFolder,
        runnerTemp,
        env: {
            PATH: `${STAND_INS}:/usr/bin:/bin`,
            HOME: home,
            RUNNER_TEMP: runnerTemp,
            LOG: log,
            STAND_INS,
            FAKE_KEYCHAINS: searchList,
            DIST_FILE_NAME: 'butler',
            RELEASE_VERSION: '9.9.9',
            GITHUB_SHA: '0123456789abcdef0123456789abcdef01234567',
            ...SECRETS,
            MACOS_CERTIFICATE: certificate,
        },
    };
}

/**
 * Runs bash with these arguments to the end, in `cwd`: always a folder of the
 * kit's, so that a script that writes where it stands, as the old ones did,
 * writes into the copy rather than into the checkout running the tests.
 *
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} env
 * @param {string} cwd
 * @returns {Promise<{ code: number | null, output: string }>}
 */
function bash(args, env, cwd) {
    return new Promise((resolve, reject) => {
        const child = spawn(BASH, args, { env, cwd, stdio: ['ignore', 'pipe', 'pipe'] });
        let output = '';
        child.stdout.on('data', (chunk) => {
            output += chunk;
        });
        child.stderr.on('data', (chunk) => {
            output += chunk;
        });
        child.on('error', reject);
        child.on('close', (code) => resolve({ code, output }));
    });
}

/**
 * @param {string} file
 * @returns {Promise<string[]>}
 */
const lines = async (file) => (await readFile(file, 'utf8')).split('\n').filter(Boolean);

/** @param {string} text */
const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Starts a script in a process group of its own, as a workflow step runs, and
 * once a stand-in has logged a call starting with `waitFor` - and is sleeping
 * in it - sends the group a signal, as cancelling the run does. Gives up, and
 * kills the group, if the call has not come within `deadline` milliseconds: a
 * script that stops short of it without ending would otherwise hold the suite
 * until the job's own timeout.
 *
 * @param {string} script
 * @param {NodeJS.ProcessEnv} env
 * @param {string} log
 * @param {string} waitFor
 * @param {NodeJS.Signals} signal
 * @param {number} [deadline]
 * @returns {Promise<{ code: number | null, output: string }>}
 */
async function signalDuring(script, env, log, waitFor, signal, deadline = 20_000) {
    const child = spawn(BASH, [script], { env, cwd: path.dirname(log), stdio: ['ignore', 'pipe', 'pipe'], detached: true });
    // Without a pid the group would be -0, and the signal would go to this
    // process's own group: the test runner.
    if (child.pid === undefined) throw new Error(`${BASH} did not start`);
    const group = -child.pid;
    let output = '';
    child.stdout.on('data', (chunk) => {
        output += chunk;
    });
    child.stderr.on('data', (chunk) => {
        output += chunk;
    });
    let ended = false;
    /** @type {Promise<number | null>} */
    const closed = new Promise((resolve) => {
        child.on('close', (code) => {
            ended = true;
            resolve(code);
        });
    });
    // Waited for until the deadline rather than for a fixed time: ample on a
    // slow runner, where the call comes in well under a second.
    const until = Date.now() + deadline;
    while (!(await lines(log)).some((c) => c.startsWith(waitFor))) {
        if (ended) throw new Error(`the script ended before ${waitFor}:\n${output}`);
        if (Date.now() > until) {
            process.kill(group, 'SIGKILL');
            await closed;
            throw new Error(`no ${waitFor} within ${deadline} ms:\n${output}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    process.kill(group, signal);
    return { code: await closed, output };
}

/**
 * @param {string[]} calls
 * @returns {string}  the keychain the run created, as `security create-keychain` was given it
 */
const createdKeychain = (calls) =>
    calls
        .find((c) => c.startsWith('security create-keychain '))
        ?.split(' ')
        .at(-1) ?? '';

describe("the macOS scripts, against stand-ins for Apple's tools", { skip }, () => {
    // Before anything runs: every tool the scripts would reach for the real
    // keychain, Apple's service or the real build with resolves to its
    // stand-in. One left out would otherwise fall through to /usr/bin/security,
    // which acts on the search list of whoever runs this, not on HOME.
    it('reaches no real tool: every one the scripts call resolves to a stand-in', () => {
        const found = spawnSync(BASH, ['-c', 'for tool in security codesign xcrun zip npx node git; do command -v "$tool"; done'], {
            env: { PATH: `${STAND_INS}:/usr/bin:/bin` },
            encoding: 'utf8',
        })
            .stdout.trim()
            .split('\n');
        assert.equal(found.length, 7, found.join('\n'));
        assert.deepEqual(
            found.filter((tool) => path.dirname(tool) !== STAND_INS),
            [],
        );
    });

    describe('scripts/release-macos.sh', () => {
        it('builds, signs, zips and notarizes, then leaves nothing of the signing behind', async (t) => {
            const k = await kit(t);
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);

            const calls = await lines(k.log);
            const keychain = createdKeychain(calls);
            assert.match(
                keychain,
                new RegExp(`^${escape(path.join(k.runnerTemp, 'butler-signing.'))}[A-Za-z0-9]{6}/butler-signing-\\d+\\.keychain-db$`),
                "the keychain is made in the run's own folder, under the runner's temp folder",
            );
            const order = [
                calls.indexOf('codesign --remove-signature butler'),
                calls.indexOf(
                    'npx postject butler NODE_SEA_BLOB build/sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 --macho-segment-name NODE_SEA',
                ),
                calls.indexOf(
                    `codesign --force -s ${IDENTITY} --keychain ${keychain} -v ./butler --deep --strict --options=runtime --timestamp --entitlements ./release-config/butler.entitlements`,
                ),
                calls.indexOf('codesign -vvv --deep --strict ./butler'),
                calls.indexOf('zip -r ./butler-9.9.9-macos-arm64.zip ./butler -x *.DS_Store'),
                calls.indexOf(
                    'zip -u -r ../butler-9.9.9-macos-arm64.zip ./config/email_templates ./config/slack_templates ./config/teams_templates ./config/production_template.yaml ./config/schedule_template.yaml ./config/log_appender_xml -x *.DS_Store',
                ),
                calls.indexOf(
                    `xcrun notarytool submit ./butler-9.9.9-macos-arm64.zip --keychain-profile butler-notarization --keychain ${keychain} --wait`,
                ),
            ];
            assert.ok(
                order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])),
                `out of order or missing (${order.join(', ')}):\n${calls.join('\n')}`,
            );
            assert.equal(calls[order[5] + 1], 'zip ran in: src', 'the config templates are zipped from src, into config/');
            assert.ok(existsSync(path.join(k.root, 'butler-9.9.9-macos-arm64.zip')), 'the zip the workflow attaches');

            // The keychain joins the end of the list, after the person's own.
            assert.ok(
                calls.includes(`security list-keychains -d user -s ${path.join(k.keychains, 'login.keychain-db')} ${keychain}`),
                calls.join('\n'),
            );

            // Teardown: the keychain deleted, the run's folder gone, the search
            // list as it was, and the default keychain never written.
            assert.ok(calls.includes(`security delete-keychain ${keychain}`), 'the keychain is deleted');
            assert.deepEqual(await readdir(k.runnerTemp), [], "the run's folder is removed");
            assert.deepEqual(await lines(k.searchList), [path.join(k.keychains, 'login.keychain-db')]);
            assert.ok(!calls.some((c) => c.startsWith('security default-keychain -d user -s')), 'the default keychain was written');
            assert.ok(!existsSync(path.join(k.root, 'certificate.p12')), 'certificate.p12 is left in the checkout');
            assert.ok(!calls.some((c) => c.includes('build.keychain')), 'build.keychain was touched');
        });

        it("imports both of Apple's CA certificates into the run's keychain", async (t) => {
            const k = await kit(t);
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);
            const calls = await lines(k.log);
            const keychain = createdKeychain(calls);
            const committed = readdirSync(path.join(ROOT, 'release-config', 'apple-ca'))
                .filter((name) => name.endsWith('.cer'))
                .sort();
            assert.deepEqual(committed, ['AppleIncRootCertificate.cer', 'DeveloperIDG2CA.cer']);
            for (const name of committed) {
                assert.ok(
                    calls.includes(`security import ${path.join(k.root, 'release-config', 'apple-ca', name)} -k ${keychain}`),
                    `${name} is not imported:\n${calls.join('\n')}`,
                );
            }
            assert.ok(!calls.some((c) => c.startsWith('curl ')), 'a CA is still downloaded');
        });

        it('a script that never reaches the call it is to be signalled in fails the check, rather than hanging it', async (t) => {
            const dir = await mkdtemp(path.join(tmpdir(), 'butler-release-kit-'));
            t.after(() => rm(dir, { recursive: true, force: true }));
            const log = path.join(dir, 'log');
            await writeFile(log, '');
            const script = path.join(dir, 'stalls.sh');
            await writeFile(script, 'sleep 600\n');
            const started = Date.now();
            await assert.rejects(
                signalDuring(script, process.env, log, 'xcrun notarytool submit', 'SIGTERM', 500),
                /no xcrun notarytool submit within 500 ms/,
            );
            assert.ok(Date.now() - started < 10_000, 'it waited for the script rather than for its deadline');
        });

        // A cancelled run signals the step's process group: INT, then TERM. The
        // script tears down on each, and must then end. bash runs a trap once
        // the command it was waiting for has died and carries on with the next
        // line unless the trap exits.
        for (const [signal, status] of /** @type {const} */ ([
            ['SIGINT', 130],
            ['SIGTERM', 143],
        ])) {
            it(`ends at ${signal} during notarization with ${status}, and still tears down`, async (t) => {
                const k = await kit(t);
                const { code, output } = await signalDuring(
                    k.release,
                    { ...k.env, FAKE_NOTARY_SLEEP: '30' },
                    k.log,
                    'xcrun notarytool submit',
                    signal,
                );
                assert.equal(code, status, output);
                assert.doesNotMatch(output, /--- done/, 'the script went on after the signal');
                const calls = await lines(k.log);
                assert.ok(
                    calls.some((c) => c.startsWith('security delete-keychain')),
                    'the keychain is deleted',
                );
                assert.deepEqual(await readdir(k.runnerTemp), [], "the run's folder, with the certificate in it, is removed");
                assert.deepEqual(await lines(k.searchList), [path.join(k.keychains, 'login.keychain-db')]);
            });
        }

        it('keeps a keychain whose path has a space on the search list', async (t) => {
            // Split on whitespace, "Work Keychain.keychain-db" became two paths
            // that do not exist, both were dropped as stale, and teardown wrote
            // the list back without it.
            const k = await kit(t, { keychains: ['login.keychain-db', 'Work Keychain.keychain-db'] });
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);
            assert.deepEqual(await lines(k.searchList), [
                path.join(k.keychains, 'login.keychain-db'),
                path.join(k.keychains, 'Work Keychain.keychain-db'),
            ]);
        });

        it("leaves other projects' keychains alone, build.keychain included, while sweeping butler's own", async (t) => {
            // ctrl-q still makes ~/Library/Keychains/build.keychain, puts it
            // first on the search list and makes it the default for its build,
            // which is the state a killed run of its leaves; persona and otlet
            // keep keychains of their own on the list while they sign. None of
            // them is butler's: deleting one, or dropping it from the list,
            // would break their build running beside this one.
            const k = await kit(t, {
                keychains: [
                    'build.keychain-db',
                    'login.keychain-db',
                    'persona-signing-999.keychain-db',
                    'otlet-signing-998.keychain-db',
                    'butler-signing-997.keychain-db',
                ],
            });
            const theirs = path.join(k.keychains, 'build.keychain-db');
            const { code, output } = await bash([k.release], { ...k.env, FAKE_DEFAULT_KEYCHAIN: theirs }, k.root);
            assert.equal(code, 0, output);
            assert.ok(existsSync(theirs), 'their keychain was deleted');
            assert.deepEqual(
                await lines(k.searchList),
                [
                    theirs,
                    path.join(k.keychains, 'login.keychain-db'),
                    path.join(k.keychains, 'persona-signing-999.keychain-db'),
                    path.join(k.keychains, 'otlet-signing-998.keychain-db'),
                ],
                "the restored search list should keep the others' and drop butler's stale one",
            );
            const calls = await lines(k.log);
            assert.ok(!calls.some((c) => c.startsWith('security delete-keychain build.keychain')), calls.join('\n'));
            assert.ok(!calls.some((c) => c.startsWith('security default-keychain -d user -s')), 'their default keychain was replaced');
            // Left alone, but said: a locked keychain of another build's as the
            // default, or first on the list, is what to look at if signing fails.
            assert.match(output, new RegExp(`::warning::the default keychain is ${escape(theirs)}, not the login keychain`));
            assert.match(output, /::warning::the search list starts with \S*build\.keychain-db, not the login keychain/);
        });

        it('warns of nothing on a Mac whose login keychain is the default and first on the list', async (t) => {
            const k = await kit(t);
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);
            assert.doesNotMatch(output, /::warning::/);
        });

        it('writes an empty search list back empty, rather than leave the deleted keychain on it', async (t) => {
            const k = await kit(t, { keychains: [] });
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);
            assert.deepEqual(await lines(k.searchList), []);
        });

        it('never writes a search list it did not snapshot', async (t) => {
            // Teardown runs whenever the script stops, also before setup has
            // read the list, and writing an empty one then would wipe the
            // person's own.
            const k = await kit(t);
            const lib = path.join(k.root, 'scripts', 'lib', 'macos-signing-keychain.sh');
            const { code, output } = await bash(['-c', '. "$1"; butler_keychain_teardown', 'bash', lib], k.env, k.root);
            assert.equal(code, 0, output);
            assert.deepEqual(
                (await lines(k.log)).filter((c) => c.startsWith('security list-keychains')),
                [],
            );
            assert.deepEqual(await lines(k.searchList), [path.join(k.keychains, 'login.keychain-db')]);
        });

        it('refuses to sign when the search list cannot be read, and leaves it as it was', async (t) => {
            // A list that could not be read is not an empty one. Taken as
            // empty, setup would put the signing keychain on the list in place
            // of the person's own, and teardown would then write the empty
            // snapshot back.
            const k = await kit(t);
            const { code, output } = await bash([k.release], { ...k.env, FAKE_LIST_KEYCHAINS_FAILS: '1' }, k.root);
            assert.notEqual(code, 0, output);
            assert.match(output, /could not read the keychain search list/);
            assert.deepEqual(await lines(k.searchList), [path.join(k.keychains, 'login.keychain-db')], 'the search list was changed');
            const calls = await lines(k.log);
            assert.deepEqual(
                calls.filter((c) => c.startsWith('security list-keychains -d user -s')),
                [],
                calls.join('\n'),
            );
            assert.ok(!calls.some((c) => c.startsWith('security create-keychain') || c.startsWith('codesign --force')), calls.join('\n'));
            assert.deepEqual(await readdir(k.runnerTemp), [], "the run's folder is left behind");
        });

        it('never writes through a certificate.p12 that something put in the checkout', async (t) => {
            // npm ci and the build run before the decode. A link left where the
            // certificate used to be decoded would have had the Developer ID key
            // written wherever it pointed.
            const k = await kit(t);
            const elsewhere = path.join(k.home, 'elsewhere.p12');
            await writeFile(elsewhere, '');
            await symlink(elsewhere, path.join(k.root, 'certificate.p12'));
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);
            assert.equal(await readFile(elsewhere, 'utf8'), '', 'the certificate was written through the link');
        });

        it("decodes the certificate for its user alone, into a folder of the run's own", async (t) => {
            const k = await kit(t);
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);
            const calls = await lines(k.log);
            const imported = calls.find((c) => c.startsWith('import-mode: ') && c.endsWith('certificate.p12')) ?? '';
            assert.match(imported, /^import-mode: 600 /, `the decoded certificate could be read by others: ${imported}`);
            const folder = path.dirname(imported.split(' ').at(-1) ?? '');
            assert.equal(path.dirname(folder), k.runnerTemp, `the certificate is decoded outside the runner's temp folder: ${folder}`);
            assert.match(path.basename(folder), /^butler-signing\.[A-Za-z0-9]{6}$/);
            assert.equal(path.dirname(createdKeychain(calls)), folder, "the keychain is made outside the run's folder");
            assert.deepEqual(await readdir(k.runnerTemp), [], "the run's folder is left behind");
        });

        it('leaves nothing behind when the certificate cannot be decoded', async (t) => {
            const k = await kit(t, { certificate: '!!! this is not base64 !!!' });
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.notEqual(code, 0, output);
            assert.deepEqual(await readdir(k.runnerTemp), [], "the run's folder is left behind");
            assert.ok(!existsSync(path.join(k.root, 'certificate.p12')), 'a half-decoded certificate.p12 is left in the checkout');
            assert.ok(!(await lines(k.log)).some((c) => c.startsWith('security create-keychain')), 'a keychain was made');
        });

        // What `ps` could read, and for how long. A command line is visible to
        // every process of this user while it runs, and notarytool's --wait
        // holds one for as long as Apple takes.
        it("puts the app-specific password on no command line but store-credentials'", async (t) => {
            const k = await kit(t);
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);
            const calls = await lines(k.log);
            const withPassword = calls.filter(
                (c) => /^(security|codesign|xcrun|zip|npx|node|esbuild|git) /.test(c) && c.includes(APP_PASSWORD),
            );
            assert.deepEqual(
                withPassword.map((c) => c.split(' ').slice(0, 3).join(' ')),
                ['xcrun notarytool store-credentials'],
            );
            const keychain = createdKeychain(calls);
            assert.ok(
                calls.some(
                    (c) => c.startsWith('xcrun notarytool store-credentials butler-notarization ') && c.endsWith(` --keychain ${keychain}`),
                ),
                "the credentials are not stored in the run's own keychain",
            );
        });

        it("imports the private key non-extractable, under a keychain password of the run's own", async (t) => {
            const k = await kit(t);
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);
            const calls = await lines(k.log);
            // The .p12 alone: the Apple CAs are imported too, and are
            // certificates with no key to protect.
            const imported = calls.find((c) => c.startsWith('security import ') && c.includes('certificate.p12 ')) ?? '';
            assert.match(
                imported,
                / -T \/usr\/bin\/codesign -x$/,
                `the private key can be exported, or used by any application: ${imported}`,
            );
            assert.doesNotMatch(imported, / -A( |$)/);
            const created = calls.find((c) => c.startsWith('security create-keychain '))?.split(' ') ?? [];
            const password = created[created.indexOf('-p') + 1] ?? '';
            assert.match(password, /^[0-9a-f]{48}$/, `the keychain password is not 24 random bytes: ${password}`);
            assert.ok(calls.includes(`security unlock-keychain -p ${password} ${created.at(-1)}`), 'it is unlocked with another password');
            assert.ok(
                calls.some((c) => c.startsWith('security set-key-partition-list ') && c.includes(` -k ${password} `)),
                'the partition list is set with another password',
            );
        });

        it('lets the build read neither the certificate nor the passwords from its environment', async (t) => {
            // esbuild and a postject that npx fetches from the registry run
            // first, with everything they start. The script hands each secret to
            // the one command that takes it, so none of them stays exported.
            const k = await kit(t);
            const { code, output } = await bash([k.release], k.env, k.root);
            assert.equal(code, 0, output);
            const held = (await lines(k.log)).filter((c) => / env holds:/.test(c));
            assert.deepEqual(held.map((c) => c.split(' ')[0]).sort(), ['esbuild', 'node', 'npx']);
            assert.deepEqual([...new Set(held.map((c) => c.replace(/^\S+ /, '')))], ['env holds: none of the secrets']);
        });

        it('refuses to start without what it needs, before it builds anything', async (t) => {
            for (const name of ['DIST_FILE_NAME', 'RELEASE_VERSION', ...Object.keys(SECRETS)]) {
                const k = await kit(t);
                const env = { ...k.env };
                delete env[name];
                const { code, output } = await bash([k.release], env, k.root);
                assert.notEqual(code, 0, `ran without ${name}:\n${output}`);
                assert.match(output, new RegExp(`${name} must be set`));
                assert.deepEqual(await lines(k.log), [], `${name} missing, and still it ran something`);
            }
        });
    });

    describe('scripts/insider-build-mac.sh', { skip: skipInsiders }, () => {
        it('builds, signs ad hoc and zips, with no secret and no keychain', async (t) => {
            const k = await kit(t);
            const env = { ...k.env };
            for (const name of Object.keys(SECRETS)) delete env[name];
            const { code, output } = await bash([k.insider], env, k.root);
            assert.equal(code, 0, output);

            const calls = await lines(k.log);
            const zip = 'butler--macos-arm64--0123456789abcdef0123456789abcdef01234567.zip';
            const order = [
                calls.indexOf('codesign --remove-signature butler'),
                calls.findIndex((c) => c.startsWith('npx postject butler NODE_SEA_BLOB ')),
                calls.indexOf('codesign --sign - ./butler'),
                calls.indexOf(`zip -r ./${zip} ./butler -x *.DS_Store`),
                calls.findIndex((c) => c.startsWith(`zip -u -r ../${zip} ./config/email_templates `)),
            ];
            assert.ok(
                order.every((at, i) => at >= 0 && (i === 0 || at > order[i - 1])),
                `out of order or missing (${order.join(', ')}):\n${calls.join('\n')}`,
            );
            assert.ok(existsSync(path.join(k.root, zip)), 'the zip the workflow uploads');
            // Nothing of the Developer ID: no keychain, no identity, no Apple.
            assert.deepEqual(
                calls.filter((c) => /^(security|xcrun) /.test(c)),
                [],
            );
            assert.deepEqual(
                calls.filter(
                    (c) => c.startsWith('codesign') && !['codesign --remove-signature butler', 'codesign --sign - ./butler'].includes(c),
                ),
                [],
            );
            const pkg = JSON.parse(await readFile(path.join(k.root, 'package.json'), 'utf8'));
            assert.match(pkg.version, /^\d+\.\d+\.\d+-\d{8}-abc1234$/, 'the insiders version stamp');
            assert.ok(!existsSync(path.join(k.root, 'build', 'build.cjs')), 'the bundle is left behind');
        });
    });
});

// The workflows that run the scripts, read as GitHub reads them.
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');
/** @param {string} name */
const workflow = (name) => /** @type {any} */ (load(readFileSync(path.join(WORKFLOWS, name), 'utf8')));
/** @param {string} script */
const required = (script) =>
    [...readFileSync(path.join(ROOT, 'scripts', script), 'utf8').matchAll(/^: "\$\{([A-Z_]+):\?/gm)].map((m) => m[1]);

describe('the workflows that run the macOS scripts', () => {
    const ci = workflow('ci.yaml');
    const release = ci.jobs['release-macos-arm64'];
    const signStep = release.steps.find((/** @type {any} */ s) => s.run?.includes('scripts/release-macos.sh'));
    const insiders = workflow('insiders-build.yaml').jobs['insiders-build'];
    const insiderStep = insiders.steps.find((/** @type {any} */ s) => s.run?.includes('scripts/insider-build-mac.sh'));

    it('give the Apple secrets to the one step that signs, and to no other step or job', () => {
        // As job env they reached every step of the release job: setup-node,
        // npm ci and its dependencies' install scripts, and the third-party
        // action that attaches the zip.
        const holding = [];
        for (const file of readdirSync(WORKFLOWS).filter((name) => /\.ya?ml$/.test(name))) {
            const { jobs = {} } = workflow(file);
            for (const [name, job] of Object.entries(jobs)) {
                if (JSON.stringify(job.env ?? {}).includes('secrets.PROD_MACOS_')) holding.push(`${file} ${name} (job env)`);
                for (const step of job.steps ?? []) {
                    if (JSON.stringify(step).includes('secrets.PROD_MACOS_')) holding.push(`${file} ${name}: ${step.name}`);
                }
            }
        }
        assert.deepEqual(holding, ['ci.yaml release-macos-arm64: Build, sign and notarize']);
    });

    it('give release-macos.sh everything it refuses to run without', () => {
        const given = { ...release.env, ...signStep.env };
        assert.deepEqual(
            required('release-macos.sh').filter((name) => !(name in given)),
            [],
        );
    });

    it('sign on a GitHub-hosted macos-15, in the release-signing environment', () => {
        assert.equal(release['runs-on'], 'macos-15');
        assert.equal(release.environment, 'release-signing');
        assert.ok(release['timeout-minutes'] > 0, 'the release job has no timeout');
    });

    it('build the insiders binary on macos-15, with no secret at all', () => {
        assert.ok(insiders.strategy.matrix.os.includes('macos-15'));
        assert.ok(!insiders.strategy.matrix.os.includes('mac-build2'), 'a leg still asks for the build Mac');
        assert.equal(insiderStep.if, "matrix.os == 'macos-15'");
        assert.doesNotMatch(JSON.stringify(insiderStep), /secrets\./);
        // GITHUB_SHA is the runner's own.
        assert.deepEqual(
            required('insider-build-mac.sh').filter((name) => !(name in (insiderStep.env ?? {})) && name !== 'GITHUB_SHA'),
            [],
        );
    });

    it('rehearse signing without releasing anything', async (t) => {
        assert.equal(ci.on.workflow_dispatch.inputs.rehearse_signing.type, 'boolean');
        assert.match(release.if, /github\.event_name == 'workflow_dispatch' && inputs\.rehearse_signing/);
        const attach = release.steps.find((/** @type {any} */ s) => s.uses?.startsWith('ncipollo/release-action'));
        assert.equal(attach.if, "needs.release-please.outputs.releases_created == 'true'", 'a rehearsal would attach to a release');
        const keep = release.steps.find((/** @type {any} */ s) => s.uses?.startsWith('actions/upload-artifact'));
        assert.equal(keep.if, "needs.release-please.outputs.releases_created != 'true'");
        assert.equal(keep.with.path, './butler-${{ steps.name.outputs.version }}-macos-arm64.zip');
        assert.equal(signStep.env.RELEASE_VERSION, '${{ steps.name.outputs.version }}');

        // The naming step, run as the runner runs a step with no shell named:
        // a release keeps its version, a rehearsal is named for the commit.
        const name = release.steps.find((/** @type {any} */ s) => s.id === 'name');
        const dir = await mkdtemp(path.join(tmpdir(), 'butler-release-kit-'));
        t.after(() => rm(dir, { recursive: true, force: true }));
        const script = path.join(dir, 'step.sh');
        await writeFile(script, name.run);
        for (const [version, expected] of [
            ['17.0.0', '17.0.0'],
            ['', 'rehearsal-0123456'],
        ]) {
            const out = path.join(dir, `output-${expected}`);
            const run = spawnSync(BASH, ['-e', script], {
                env: { PATH: '/usr/bin:/bin', RELEASE_VERSION: version, GITHUB_SHA: '0123456789abcdef', GITHUB_OUTPUT: out },
                encoding: 'utf8',
            });
            assert.equal(run.status, 0, run.stderr);
            assert.equal(readFileSync(out, 'utf8'), `version=${expected}\n`);
        }
    });

    it('name neither build.keychain nor the shared keychain password, anywhere they could be used', () => {
        // The workflows whole, and the shell the scripts run: comments may say
        // why the names are gone, code may not use them.
        const sources = [
            ...readdirSync(WORKFLOWS).map((name) => ({
                file: `.github/workflows/${name}`,
                text: readFileSync(path.join(WORKFLOWS, name), 'utf8'),
            })),
            ...['release-macos.sh', 'insider-build-mac.sh', 'lib/macos-signing-keychain.sh'].map((name) => ({
                file: `scripts/${name}`,
                text: readFileSync(path.join(ROOT, 'scripts', name), 'utf8')
                    .split('\n')
                    .filter((line) => !/^\s*#/.test(line))
                    .join('\n'),
            })),
        ];
        const found = sources.filter(({ text }) => /build\.keychain|MACOS_CI_KEYCHAIN_PWD/.test(text)).map(({ file }) => file);
        assert.deepEqual(found, []);
    });
});

// The Windows release, in ci.yaml's three jobs. None of it can run here: it needs
// Windows and the Azure signing credential. What can be held is its wiring, the
// reason it is three jobs (plabs-house-rules, rules/ci/public-repositories.md),
// and the publish step that checks the zip against what sign-win64 verified.
/** GitHub's own runners, the only ones a public repository may use. */
const HOSTED = ['ubuntu-latest', 'ubuntu-slim', 'ubuntu-24.04-arm', 'windows-latest', 'macos-15'];
/** @param {any} job @returns {string[]} the labels a job may ask for, matrix legs included */
const runsOn = (job) => (job['runs-on'] === '${{ matrix.os }}' ? job.strategy.matrix.os : [job['runs-on']].flat());
/** @param {any} job */
const runs = (job) => (job.steps ?? []).map((/** @type {any} */ s) => s.run ?? '').join('\n');

describe('the Windows release jobs', () => {
    const ci = workflow('ci.yaml');
    const build = ci.jobs['build-win64'];
    const sign = ci.jobs['sign-win64'];
    const publish = ci.jobs['publish-win64'];
    const insiders = workflow('insiders-build.yaml').jobs['insiders-build'];

    it('replace release-win64, which asked for a self-hosted runner that never starts', () => {
        assert.equal(ci.jobs['release-win64'], undefined);
        assert.deepEqual(
            [build, sign, publish].map((job) => job['runs-on']),
            ['windows-latest', 'windows-latest', 'ubuntu-latest'],
        );
    });

    it('sign in a job that runs nothing from the repository', () => {
        // No checkout, no npm and no script of the repository's: a compromised
        // dependency must not be able to reach the OIDC token.
        const uses = sign.steps.map((/** @type {any} */ s) => s.uses?.split('@')[0]).filter(Boolean);
        assert.deepEqual(uses, ['actions/download-artifact', 'azure/login', 'azure/artifact-signing-action', 'actions/upload-artifact']);
        assert.doesNotMatch(runs(sign), /\bnpm\b|\bnpx\b|\bnode\b|\.\/scripts|\.\\scripts/);
    });

    it('give the signing credential to sign-win64 alone, in the master-only environment', () => {
        assert.equal(sign.environment, 'release-signing');
        assert.deepEqual(sign.permissions, { 'id-token': 'write', contents: 'read' });
        const holding = [];
        for (const file of readdirSync(WORKFLOWS).filter((name) => /\.ya?ml$/.test(name))) {
            for (const [name, job] of Object.entries(workflow(file).jobs ?? {})) {
                if (/vars\.(AZURE|SIGNING)_/.test(JSON.stringify(job))) holding.push(`${file} ${name}`);
            }
        }
        assert.deepEqual(holding, ['ci.yaml sign-win64']);
        for (const job of [build, publish]) {
            assert.equal(job.environment, undefined);
            assert.doesNotMatch(JSON.stringify(job), /secrets\./);
        }
        assert.deepEqual(build.permissions, { contents: 'read' });
    });

    it('sign only what build-win64 recorded, as Ptarmigan Labs AB, and hand on the hash it verified', () => {
        assert.match(runs(sign), /throw "Refusing to sign: the artifact does not match the digest build-win64 recorded\."/);
        const verify = sign.steps.find((/** @type {any} */ s) => s.id === 'verify');
        assert.match(verify.run, /\$signer -cne 'Ptarmigan Labs AB'/);
        assert.match(verify.run, /verify \/pa \/v to-sign\\butler\.exe/);
        assert.match(verify.run, /GITHUB_OUTPUT -Value "sha256=\$hash"/);
        assert.equal(sign.outputs.signed_sha256, '${{ steps.verify.outputs.sha256 }}');
        const zip = publish.steps.find((/** @type {any} */ s) => s.name === 'Zip it');
        assert.equal(zip.env.SIGNED_SHA256, '${{ needs.sign-win64.outputs.signed_sha256 }}');
    });

    it('rehearse signing without publishing anything', () => {
        assert.match(build.if, /github\.event_name == 'workflow_dispatch' && inputs\.rehearse_signing/);
        assert.equal(sign.if, "${{ !cancelled() && needs.build-win64.result == 'success' }}");
        assert.match(publish.if, /needs\.release-please\.outputs\.releases_created == 'true'/);
        assert.match(publish.if, /needs\.sign-win64\.result == 'success'/);
    });

    it("attach the zip under the name the release's Windows asset has always had", () => {
        const attach = publish.steps.find((/** @type {any} */ s) => s.uses?.startsWith('ncipollo/release-action'));
        assert.equal(attach.with.artifacts, './butler-${{ needs.release-please.outputs.release_version }}-win.zip');
        assert.equal(
            publish.steps.find((/** @type {any} */ s) => s.name === 'Zip it').env.ZIP_NAME,
            'butler-${{ needs.release-please.outputs.release_version }}-win.zip',
        );
    });

    it('publish only a zip whose butler.exe is the binary sign-win64 verified', { skip }, async (t) => {
        // The step itself, run as the runner runs a step with no shell named,
        // in a folder laid out as the two downloads leave it.
        const zip = publish.steps.find((/** @type {any} */ s) => s.name === 'Zip it');
        const dir = await mkdtemp(path.join(tmpdir(), 'butler-publish-win64-'));
        t.after(() => rm(dir, { recursive: true, force: true }));
        const script = path.join(dir, 'step.sh');
        await writeFile(script, zip.run);
        const run = async (/** @type {string} */ signed, /** @type {string} */ name) => {
            const work = path.join(dir, name);
            await mkdir(path.join(work, 'package', 'config'), { recursive: true });
            await writeFile(path.join(work, 'package', 'butler.exe'), 'the binary sign-win64 verified');
            await writeFile(path.join(work, 'package', 'config', 'production_template.yaml'), 'template');
            return spawnSync(BASH, ['-e', script], {
                cwd: work,
                env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', ZIP_NAME: 'butler-9.9.9-win.zip', SIGNED_SHA256: signed },
                encoding: 'utf8',
            });
        };
        const verified = spawnSync('/bin/sh', ['-c', "printf '%s' 'the binary sign-win64 verified' | sha256sum | cut -d' ' -f1"], {
            env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin' },
            encoding: 'utf8',
        }).stdout.trim();
        assert.match(verified, /^[0-9a-f]{64}$/);

        // PowerShell's Get-FileHash, which sign-win64 uses, writes the hash in capitals.
        const good = await run(verified.toUpperCase(), 'good');
        assert.equal(good.status, 0, good.stdout + good.stderr);
        assert.match(good.stdout, /is the one sign-win64 verified/);

        const swapped = await run('0'.repeat(64), 'swapped');
        assert.notEqual(swapped.status, 0, 'a binary sign-win64 never verified was zipped for publishing');
        assert.match(swapped.stdout, /is not the binary sign-win64 verified/);

        const none = await run('', 'none');
        assert.notEqual(none.status, 0, 'published without a hash from sign-win64');
        assert.match(none.stdout, /recorded no hash/);
    });

    it('build the insiders Windows binary on windows-latest, unsigned, with no secret', () => {
        assert.ok(insiders.strategy.matrix.os.includes('windows-latest'));
        const step = insiders.steps.find((/** @type {any} */ s) => s.run?.includes('scripts/insider-build-win.ps1'));
        assert.equal(step.if, "matrix.os == 'windows-latest'");
        assert.doesNotMatch(JSON.stringify(step), /secrets\./);
        const code = readFileSync(path.join(ROOT, 'scripts', 'insider-build-win.ps1'), 'utf8')
            .split('\n')
            .filter((line) => !/^\s*#/.test(line))
            .join('\n');
        assert.doesNotMatch(code, /\bsign \/|THUMBPRINT/);
    });
});

describe('every workflow', () => {
    const files = readdirSync(WORKFLOWS).filter((name) => /\.ya?ml$/.test(name));

    it('runs every job on a GitHub-hosted runner', () => {
        // The organisation's self-hosted runner groups do not admit public
        // repositories, so a job that asks for one queues for a day and is
        // cancelled, and nothing reports a failure.
        const elsewhere = [];
        for (const file of files) {
            for (const [name, job] of Object.entries(workflow(file).jobs ?? {})) {
                for (const label of runsOn(job)) if (!HOSTED.includes(label)) elsewhere.push(`${file} ${name}: ${label}`);
            }
        }
        assert.deepEqual(elsewhere, []);
    });

    it('gives every job a timeout', () => {
        // But the agentic workflow's lock file, which gh aw compile writes from
        // its .md, where the agent's timeout is set.
        const without = [];
        for (const file of files.filter((name) => !name.endsWith('.lock.yml'))) {
            for (const [name, job] of Object.entries(workflow(file).jobs ?? {})) {
                if (!(job['timeout-minutes'] > 0)) without.push(`${file} ${name}`);
            }
        }
        assert.deepEqual(without, []);
    });

    it('names no retired signing secret, deploy variable or self-hosted runner', () => {
        const found = files.filter((name) =>
            /WIN_CODESIGN_|CODESIGN_WIN_|BUTLER_INSIDER_|win-code-sign|self-hosted|host2-win/.test(
                readFileSync(path.join(WORKFLOWS, name), 'utf8')
                    .split('\n')
                    .filter((line) => !/^\s*#/.test(line))
                    .join('\n'),
            ),
        );
        assert.deepEqual(found, []);
    });
});
