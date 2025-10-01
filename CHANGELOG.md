# Changelog

## [14.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v13.1.2...butler-v14.0.0) (2025-10-01)


### ⚠ BREAKING CHANGES

* -c / --configfile option is now mandatory.

### Features

* -c / --configfile option is now mandatory. ([f8a54a5](https://github.com/ptarmiganlabs/butler/commit/f8a54a5b64382672925fb812a68f650b22653711))
* add first set of tests in the new unit test suite ([a3cf65e](https://github.com/ptarmiganlabs/butler/commit/a3cf65e03f7a573bbcf2541f8a76a50f4e98aa4c))
* **build:** include build date in insider's build versioning ([247de86](https://github.com/ptarmiganlabs/butler/commit/247de8669dab0b09169a0e4ee7b16565e21e24a4))
* **ci:** add automatic Windows insider build deployment and log monitoring ([5cf49df](https://github.com/ptarmiganlabs/butler/commit/5cf49df6f36a701c90bbcfe13385d008e12f767d))
* **ci:** add Windows insider build deployment and log monitoring workflows ([e9df0eb](https://github.com/ptarmiganlabs/butler/commit/e9df0eb7308841d7c0067ee99d4e8826c673b19a))
* **configvis:** add comprehensive jjsontree upgrade infrastructure ([666a943](https://github.com/ptarmiganlabs/butler/commit/666a943eb2facd037bed676f03ca1a569f2c7e63))
* **configvis:** upgrade jsontree to v4.7.1 and add comprehensive unit tests ([8559104](https://github.com/ptarmiganlabs/butler/commit/8559104ca60e53b903d2ee51d6151cb98160ee61))
* enhance log messages when no config file is specified on startup ([8fe18cf](https://github.com/ptarmiganlabs/butler/commit/8fe18cf500ac32b6a2ef94da9a3389caf6fda52b))
* implement conditional configuration validation and update dependencies ([dd85636](https://github.com/ptarmiganlabs/butler/commit/dd856365ae389ba1a5a38493c84263eb999be0ed))
* **lib:** replace serializeapp dependency with internal implementation ([fa0a12b](https://github.com/ptarmiganlabs/butler/commit/fa0a12b44f387afbf03b44f148ed5863158a7759))
* **lib:** replace serializeapp dependency with internal implementation ([2ee49bf](https://github.com/ptarmiganlabs/butler/commit/2ee49bf4f112bf5cf00dce4eb27e52375f65c626))
* **lib:** replace serializeapp dependency with internal implementation ([b4a5c13](https://github.com/ptarmiganlabs/butler/commit/b4a5c132fd091836607f191c444640c3dd4cae57))
* **qseow:** implement proper CSRF protection in calls to QRS API ([d78c303](https://github.com/ptarmiganlabs/butler/commit/d78c30329f10dfbb3bd5c96954f75a213ee1c37d))
* **qseow:** implement proper CSRF protection in calls to QRS API ([d0c5d2d](https://github.com/ptarmiganlabs/butler/commit/d0c5d2d5d5e6fec0cb6ffbb42b4e6beda5bebf64))
* replace qrs-interact dependency with Axios-based QRS client ([269bfd6](https://github.com/ptarmiganlabs/butler/commit/269bfd60c4cbdc42a06dbac2268bc44cffc9bec1))
* replace qrs-interact dependency with Axios-based QRS client ([bf22399](https://github.com/ptarmiganlabs/butler/commit/bf22399182d82a365dd93a53a3fb028db8304b19))
* **static:** upgrade prism.js from v1.29.0 to v1.30.0 with comprehensive tests ([fdd2f2c](https://github.com/ptarmiganlabs/butler/commit/fdd2f2c0e6f45d3cef23a22c83aa1df6ce14e9c0))
* **svc monitor:** filter out empty service status blocks in statusAll function ([9af44c9](https://github.com/ptarmiganlabs/butler/commit/9af44c9ff4065c789276d21d4370d7c6cf0d4dfb))
* **tests:** add comprehensive API schema tests for key-value store and scheduler ([513df1f](https://github.com/ptarmiganlabs/butler/commit/513df1f8ead91a7d586335b76f84b70608e3ba20))
* **tests:** add comprehensive app owner alert tests and TLS configuration tests for smtp module ([70ed05e](https://github.com/ptarmiganlabs/butler/commit/70ed05e0e39897a8e807df2b101356500f1c7615))
* **tests:** add comprehensive unit tests for API schemas and utility functions ([7459d05](https://github.com/ptarmiganlabs/butler/commit/7459d05bb9ee21ad82238b0db5633158a79cc4e4))
* **tests:** add comprehensive unit tests for assert_config_file and smtp modules ([e4d7318](https://github.com/ptarmiganlabs/butler/commit/e4d7318cfb0f8e67f5ee771d0c90c2639111e026))
* **tests:** add comprehensive unit tests for config_obfuscate, qscloud/util, and qseow/get_qs_urls modules ([3b112ec](https://github.com/ptarmiganlabs/butler/commit/3b112ec4efc9ebb8bb4cf9bbab40648fc076f63e))
* **tests:** add comprehensive unit tests for email notifications, Teams notifications, scheduler, telemetry, and config assertion modules ([466038c](https://github.com/ptarmiganlabs/butler/commit/466038c572b9c604a60d676bc052f1bf6ce40eb8))
* **tests:** add comprehensive unit tests for incident management modules achieving 85%+ coverage ([cd82abf](https://github.com/ptarmiganlabs/butler/commit/cd82abfba16e0eb09951b36fd9589632175976cb))
* **tests:** add comprehensive unit tests for QS Cloud API modules ([2be39a2](https://github.com/ptarmiganlabs/butler/commit/2be39a252355d8f2068c6d7ed6b74da861a148df))
* **tests:** add comprehensive unit tests for qseow modules achieving 85%+ coverage for critical components ([15f5e9e](https://github.com/ptarmiganlabs/butler/commit/15f5e9ec1cec81d1225d29d91b47f77ff5149bdc))
* **tests:** add comprehensive unit tests for scriptlog, webhook_notification, msteams_notification, smtp, qliksense_license and winsvc modules ([f364379](https://github.com/ptarmiganlabs/butler/commit/f3643797dd39067dcd1fe4858cb115f64c18e7e7))
* **tests:** Add more unit tests, increasing test coverage ([7999742](https://github.com/ptarmiganlabs/butler/commit/7999742f046e45883f8169895d2aa534605bcd4e))
* **tests:** add MQTT API schema tests and configure comprehensive coverage collection ([777eddf](https://github.com/ptarmiganlabs/butler/commit/777eddf9095d592425404d4e789da694eb70bac2))
* **tests:** add unit tests for email_notification_qscloud with tag gating functionality ([fadb32d](https://github.com/ptarmiganlabs/butler/commit/fadb32de8830ffe5733c6e11dd108b91b475a5bc))
* **tests:** add unit tests for email_notification_qscloud.js achieving 55% coverage from 0% ([712cd15](https://github.com/ptarmiganlabs/butler/commit/712cd158bc9a810edea37eae265572968fd90298))
* **tests:** add unit tests for support plugin, improving overall test coverage ([54bea3a](https://github.com/ptarmiganlabs/butler/commit/54bea3ad60c250707f00289be4df61bd2d65e6e0))
* **tests:** add working unit tests for scheduler.js (61% coverage) and telemetry.js (73% coverage) ([620909f](https://github.com/ptarmiganlabs/butler/commit/620909f0bfcf13a26490b9197556dada66770699))
* **tests:** implement comprehensive unit tests for API schemas and utility functions ([7b04e2f](https://github.com/ptarmiganlabs/butler/commit/7b04e2f4cd1ad1b91af090646a71550cc35d2826))
* **tests:** improve test coverage for telemetry, post_to_influxdb, qliksense_license, and service_monitor ([722851d](https://github.com/ptarmiganlabs/butler/commit/722851d178cc9f29dd0476f1e8d1ea4b7696d96e))


### Bug Fixes

* **build:** add build:docker script for Docker image creation ([fe837f7](https://github.com/ptarmiganlabs/butler/commit/fe837f7df97c8b1ff5afa35f1933893e07da5708))
* **build:** add build:docker script for Docker image creation ([f35ad89](https://github.com/ptarmiganlabs/butler/commit/f35ad892dfe3e039afea0174d9aa967f6d396803))
* **config:** merge YAML-configured headers with hardcoded QRS headers ([2fc2103](https://github.com/ptarmiganlabs/butler/commit/2fc2103365c173f73b5068c14124187493e4572d))
* **config:** merge YAML-configured headers with hardcoded QRS headers ([07de0db](https://github.com/ptarmiganlabs/butler/commit/07de0dbe4972eca43a8734a99b2a56d829422b08))
* **config:** replace hardcoded QRS and Engine ports/SSL with config values and preserve header merging ([93ee135](https://github.com/ptarmiganlabs/butler/commit/93ee1357892f3efedbe2f2ad24f12236d208f65b))
* **config:** replace hardcoded QRS port 4242 with config values ([589ea75](https://github.com/ptarmiganlabs/butler/commit/589ea754a339e9dad9b6740565ff3fa610427d6f))
* **config:** replace hardcoded QRS port 4242 with config values ([2358d75](https://github.com/ptarmiganlabs/butler/commit/2358d757e31927a1d6c657c2123222bd7a4cf6ac))
* **config:** respect SSL settings for QRS and Engine API calls ([58e45b7](https://github.com/ptarmiganlabs/butler/commit/58e45b72a02ed8b6359be74a063214ce26ba3737))
* **config:** respect SSL settings for QRS and Engine API calls ([8ad4423](https://github.com/ptarmiganlabs/butler/commit/8ad4423390fbf77b04aeac78d1cafe4aba2873bd))
* Disable custom property reload task in production template configuration ([d0d0ca6](https://github.com/ptarmiganlabs/butler/commit/d0d0ca67073eeb812a5ef3d946a7bda52446a911))
* **logging:** improve debug output for custom properties in email and InfluxDB assertions ([eb9e7f1](https://github.com/ptarmiganlabs/butler/commit/eb9e7f1b8726b58957acc47c9598bb05bf685b39))
* **logging:** improve debug output for custom properties in email and InfluxDB assertions ([6619dbc](https://github.com/ptarmiganlabs/butler/commit/6619dbce9ce2f6e76bd17770c9a65d6284e1c6f7))
* **logging:** improve debug output for custom properties in email and… ([3670a79](https://github.com/ptarmiganlabs/butler/commit/3670a799e091587b3039f04776e6f038ef404866))
* Make template config file contain more realistic sample values ([5de0ace](https://github.com/ptarmiganlabs/butler/commit/5de0aceb0cfd67989a32c5c160dfb38332da3dd5))
* Make template config file contain more realistic sample values ([7f5b673](https://github.com/ptarmiganlabs/butler/commit/7f5b6730085c99ec4ba439553a26017029f6324d))
* **mqtt:** add broken start-tasks-via-mqtt feature ([8604de7](https://github.com/ptarmiganlabs/butler/commit/8604de72acf05f37b04b48e68b90727460cc4fed))
* **security:** better, more secure parsing of Slack notification templates ([93d611c](https://github.com/ptarmiganlabs/butler/commit/93d611c08968266b90be24f8fbeba2d7b640a5e1))
* **security:** resolve critical Slack notification escaping and prototype pollution vulnerabilities ([6335351](https://github.com/ptarmiganlabs/butler/commit/6335351f5e9b53eb7f9b57060a2768f89408beaf))
* **tests:** add getQRSHttpHeaders mock to various test files ([defadf9](https://github.com/ptarmiganlabs/butler/commit/defadf9f7dca8fb651ad8e41b611000cd572a36f))
* **tests:** add getQRSHttpHeaders mock to various test files ([8743413](https://github.com/ptarmiganlabs/butler/commit/87434133ada09e9cb9eaa272f51488d8d8073078))
* **tests:** fix service_monitor test error handling and qliksense_license test imports ([e9d750f](https://github.com/ptarmiganlabs/butler/commit/e9d750ffe673fa35f36ad6551ae6a2f70b86499f))
* **tests:** remove problematic test files and analyze coverage gaps for targeted test additions ([75dac07](https://github.com/ptarmiganlabs/butler/commit/75dac07d0301a3ee258de26ad06dca7b18fb6445))
* **tests:** update post_to_influxdb tests with correct function names and working test cases ([4dde3b7](https://github.com/ptarmiganlabs/butler/commit/4dde3b717d3bf75371c21857783bbcc14300504f))
* update notification functions to use await for asynchronous calls in Teams, Slack, and Webhook notifications ([a14032a](https://github.com/ptarmiganlabs/butler/commit/a14032afa92fedaa0aa5c46cdefc94903d01d618))


### Miscellaneous

* **deos:** update nodemailer to version 7.0.5 ([7e836b7](https://github.com/ptarmiganlabs/butler/commit/7e836b7dbcaa9a8bc56aed477f129d1b2e3f6da6))
* **deps:** update actions/checkout action to v5 ([627196f](https://github.com/ptarmiganlabs/butler/commit/627196f4cdac4feb9b1af3f164ab5d1aec0dd256))
* **deps:** update actions/checkout action to v5 ([12868b4](https://github.com/ptarmiganlabs/butler/commit/12868b41a52bd9ec7195a8d5823cd5d6b61c87db))
* **deps:** update actions/setup-node action to v5 ([47658b5](https://github.com/ptarmiganlabs/butler/commit/47658b5ca22394643ec901802c4a657bf929c5ab))
* **deps:** update actions/setup-node action to v5 ([9fcdbc0](https://github.com/ptarmiganlabs/butler/commit/9fcdbc0ddc1c43a99eb4d516cc98ce07ad055eae))
* **deps:** update actions/stale action to v10 ([9f77431](https://github.com/ptarmiganlabs/butler/commit/9f7743172bde1ab0d8e2d70d19ca9fc96122e3fe))
* **deps:** update actions/stale action to v10 ([363561b](https://github.com/ptarmiganlabs/butler/commit/363561bdfc6b5ae37e265ee4cd94a0845376b381))
* **deps:** update dependencies and UUID related unit tests ([426f710](https://github.com/ptarmiganlabs/butler/commit/426f71029c7bc952c273d2b65c5bf459f730e54c))
* **deps:** update dependencies to latest versions ([0a8c4d2](https://github.com/ptarmiganlabs/butler/commit/0a8c4d25970115e159ed89ca6200ed9216545da1))
* **deps:** update dependencies to latest versions ([cc59884](https://github.com/ptarmiganlabs/butler/commit/cc598847fae4bd093a7bcd13b3d7916ddfb30903))
* **deps:** update dependencies to latest versions ([e455bbf](https://github.com/ptarmiganlabs/butler/commit/e455bbf3478054910e956a20ef5042029007c71c))
* **deps:** update dependency eslint-plugin-jsdoc to v54 ([8b624b3](https://github.com/ptarmiganlabs/butler/commit/8b624b3bc33ed06e1333e46aa712389e264a6745))
* **deps:** upgrade jsontree to v4.7.1 and add unit tests ([302d6fd](https://github.com/ptarmiganlabs/butler/commit/302d6fd4493012ad89709de3e87aff4a2fa9452e))
* **deps:** upgrade prism.js from v1.29.0 to v1.30.0 and add unit tests ([b62d01a](https://github.com/ptarmiganlabs/butler/commit/b62d01aec6d49ed0c36bf07ed06675f85ba84154))
* update dependencies for fastify, posthog-node, eslint-plugin-jsdoc ([8ddc544](https://github.com/ptarmiganlabs/butler/commit/8ddc544697f3a2da68aa854fa1762285311773e4))


### Refactoring

* clean up eslint-disable comments and improve code readability across multiple files ([0b460b3](https://github.com/ptarmiganlabs/butler/commit/0b460b38dff160da43deb093fb61ff8b1387e801))
* improve error logging when running as a standalone binary ([8e5f710](https://github.com/ptarmiganlabs/butler/commit/8e5f710ff0823645338e96d4978401b1d0224f31))


### Documentation

* update configuration file location in help text ([cd9b7ed](https://github.com/ptarmiganlabs/butler/commit/cd9b7ed0383e2423e534b17f08e29b98088ce187))
* update copilot instructions to require Copilot to use conventional commits ([b67bfeb](https://github.com/ptarmiganlabs/butler/commit/b67bfeb1857a7972ca56f9759ef125904613f728))
* update copilot instructions to require Copilot to use conventional commits ([5386db6](https://github.com/ptarmiganlabs/butler/commit/5386db6e8a74ddad97df7ba015ce0366b5199386))

## [13.1.2](https://github.com/ptarmiganlabs/butler/compare/butler-v13.1.1...butler-v13.1.2) (2024-11-30)


### Bug Fixes

* **access-license:** Make logging when releasing licenses less verbose ([3e54c0a](https://github.com/ptarmiganlabs/butler/commit/3e54c0a97a01047e2ffb5aa38dff0a417e78eb8a)), closes [#1303](https://github.com/ptarmiganlabs/butler/issues/1303)
* **qseow:** Fix broken email templates for failed/aborted/successful reloads ([0f44dd5](https://github.com/ptarmiganlabs/butler/commit/0f44dd5e2e90f63935983817e2a6910597b56fbb)), closes [#1292](https://github.com/ptarmiganlabs/butler/issues/1292)
* **qseow:** Make writing reload script logs to disk more robust ([d42f27d](https://github.com/ptarmiganlabs/butler/commit/d42f27d4ecb362892c353d1c09bb166dd0db4554)), closes [#1296](https://github.com/ptarmiganlabs/butler/issues/1296)


### Miscellaneous

* Update dependencies to stay safe and secure ([ebe8c44](https://github.com/ptarmiganlabs/butler/commit/ebe8c441eae82ad6f2512a017174d6ce440d1b09))

## [13.1.1](https://github.com/ptarmiganlabs/butler/compare/butler-v13.1.0...butler-v13.1.1) (2024-10-24)


### Bug Fixes

* **influxdb:** Remove pre-defined schema for InfluxDB database ([cbdfce3](https://github.com/ptarmiganlabs/butler/commit/cbdfce35628705589c5146674db24bf753bdee59)), closes [#1286](https://github.com/ptarmiganlabs/butler/issues/1286)
* **license-release:** Allow empty arrays for never-release users, custom properties etc ([03ac212](https://github.com/ptarmiganlabs/butler/commit/03ac2120be2c53cccaf8b1523fb3fad283de1263)), closes [#1287](https://github.com/ptarmiganlabs/butler/issues/1287)
* **logs:** Clearer logging when sending data to InfluxDB ([56663da](https://github.com/ptarmiganlabs/butler/commit/56663dabb1f0ba8ec06161d8243b8263c9caf99f)), closes [#1288](https://github.com/ptarmiganlabs/butler/issues/1288)


### Miscellaneous

* **deps:** Updated dependencies ([82a2c7c](https://github.com/ptarmiganlabs/butler/commit/82a2c7cf847384c39c9b7fc1b354f2b4174e5bc3))

## [13.1.0](https://github.com/ptarmiganlabs/butler/compare/butler-v13.0.0...butler-v13.1.0) (2024-10-20)


### Features

* **alerts:** Add new script log size template variables. ([44ca5a5](https://github.com/ptarmiganlabs/butler/commit/44ca5a5998570bd45fee4d6f8dad9c9e2bfdf947)), closes [#1276](https://github.com/ptarmiganlabs/butler/issues/1276)


### Bug Fixes

* **alert:** Fix unhandled exception when getting client-managed app metadata ([c838e01](https://github.com/ptarmiganlabs/butler/commit/c838e017811a05db43bf8bd76b3fbbb6d83e9ba9)), closes [#1274](https://github.com/ptarmiganlabs/butler/issues/1274)
* **cloud-reload-alert:** Make script log head/tail include correct number of rows ([a230f0d](https://github.com/ptarmiganlabs/butler/commit/a230f0d7bc489ef5d1ae05b488e7f470a5fe2b56)), closes [#1275](https://github.com/ptarmiganlabs/butler/issues/1275)


### Miscellaneous

* **deps:** Update dependencies ([154b3f3](https://github.com/ptarmiganlabs/butler/commit/154b3f355c5470ef437215520f4fe63cd36340ef))
* **deps:** Update dependencies ([dd56231](https://github.com/ptarmiganlabs/butler/commit/dd56231367cab5d546883363a33bf276a9d13c6d))


### Refactoring

* **logging:** Show if log entries are associated with QS Cloud or client-managed ([6054916](https://github.com/ptarmiganlabs/butler/commit/605491659fcd6604e3b7c9cc7ec658834a5f21eb)), closes [#1279](https://github.com/ptarmiganlabs/butler/issues/1279)

## [13.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v13.0.0...butler-v13.0.0) (2024-10-15)


### ⚠ BREAKING CHANGES

* **script-log:** Changing config fils structure to prep for future features
* **config:** Get rid of old typos and outdated structure in config file
* **ms-teams:** Use MS Power Automate for sending Teams messges

### Features

* **alert-templates:** Add more template variables to email, Slack, Teams alerts ([25aaa2b](https://github.com/ptarmiganlabs/butler/commit/25aaa2b189ff570c95b6042d56f2892cd04ed02f)), closes [#1250](https://github.com/ptarmiganlabs/butler/issues/1250)
* **alerts:** Add arbitrary URLs to reload failed/stopped/success msgs ([5e613db](https://github.com/ptarmiganlabs/butler/commit/5e613db4671a4cb9d4e53b6aa88a75249f4c8bd8)), closes [#1220](https://github.com/ptarmiganlabs/butler/issues/1220)
* **config-vis:** Show current config in web page ([b53eaf7](https://github.com/ptarmiganlabs/butler/commit/b53eaf7053e0319273c685afd6a400b370d1c7af)), closes [#1199](https://github.com/ptarmiganlabs/butler/issues/1199)
* **config:** Visualise config file in Butler hosted web page ([29356ce](https://github.com/ptarmiganlabs/butler/commit/29356ce36c9d6edf4a0b605b2b63be1c95fcaee3)), closes [#1199](https://github.com/ptarmiganlabs/butler/issues/1199)
* **email-alert:** Send email when select reload tasks finish successfully ([6a0e49b](https://github.com/ptarmiganlabs/butler/commit/6a0e49bae6172bf35f1ea366426a2486b0484d26)), closes [#1207](https://github.com/ptarmiganlabs/butler/issues/1207)
* **failed-task-alert:** Make failed reload task email look the same as QS Cloud ditto ([c163ad4](https://github.com/ptarmiganlabs/butler/commit/c163ad4c7d9769ea6e51e11bfb8b4a884a432fa1)), closes [#1237](https://github.com/ptarmiganlabs/butler/issues/1237)
* **qs-cloud:** Reload failed alerts to email ([1d4a62d](https://github.com/ptarmiganlabs/butler/commit/1d4a62d38f5ae8382c2b483c1af1faf4cf40902f))
* **qs-cloud:** Reload failed alerts to MS Teams ([523722a](https://github.com/ptarmiganlabs/butler/commit/523722a00a6a1c7c98ead806a171a6b14a388651))
* **qs-cloud:** Reload failed alerts to Slack ([fa35d91](https://github.com/ptarmiganlabs/butler/commit/fa35d91dc6993c2c32722425b1d3a66fef7f54df))
* Verify that needed email alert related custom properties exist in QS ([6babb0f](https://github.com/ptarmiganlabs/butler/commit/6babb0f1acffab2c80f88a98fa56984cd3aacd26)), closes [#1256](https://github.com/ptarmiganlabs/butler/issues/1256)


### Bug Fixes

* Fix error when sending successful reload email for apps and tasks with no tags associated with them ([c945493](https://github.com/ptarmiganlabs/butler/commit/c94549362c040670281f8650578276f1ce232a26))
* **ms-teams:** Use MS Power Automate for sending Teams messges ([4f46e60](https://github.com/ptarmiganlabs/butler/commit/4f46e6087641ff925b67e7c151bc1b9fc31a6d3a)), closes [#1239](https://github.com/ptarmiganlabs/butler/issues/1239)
* **scheduler:** Fix broken "scheduler" test case ([0012f6d](https://github.com/ptarmiganlabs/butler/commit/0012f6d1cc80d73df102f0aff660d5f09b609769)), closes [#1245](https://github.com/ptarmiganlabs/butler/issues/1245)
* **script-log:** Changing config fils structure to prep for future features ([e81ee39](https://github.com/ptarmiganlabs/butler/commit/e81ee39c85f17d87fd1a3d7d4db64327b1dd21a9))
* **service-alerts:** Update win service alert templates to latest look-n-feel ([b2e8bab](https://github.com/ptarmiganlabs/butler/commit/b2e8babd2e1f48a5d1cff99ad52d6f55567c6bb8)), closes [#1257](https://github.com/ptarmiganlabs/butler/issues/1257)
* Show correct config file path in log during startup ([580d00d](https://github.com/ptarmiganlabs/butler/commit/580d00dec52dff086633919cc933d1dda3b60e26)), closes [#1270](https://github.com/ptarmiganlabs/butler/issues/1270)
* **slack-alert:** Align Slack template for QSEoW alerts with QS Cloud ditto ([2769553](https://github.com/ptarmiganlabs/butler/commit/2769553e4ea10367d37c6d4e097299aaf6854c8f)), closes [#1238](https://github.com/ptarmiganlabs/butler/issues/1238)
* Test case "senseapp" now works again ([054faa6](https://github.com/ptarmiganlabs/butler/commit/054faa60bbff347dd49e0953cfddd75ea0e067c9)), closes [#1244](https://github.com/ptarmiganlabs/butler/issues/1244)
* **test:** Fix broken test of `buterping` API endpoint ([39827c8](https://github.com/ptarmiganlabs/butler/commit/39827c82852c5dc0eb0c54943279aa6f14c36c51))
* **winsvc-monitor:** Making verbose logging less spammy ([f8981b3](https://github.com/ptarmiganlabs/butler/commit/f8981b3d9b6611cc87821da4d9d94af154ee7e3b)), closes [#1234](https://github.com/ptarmiganlabs/butler/issues/1234)
* **xml-appender:** Update XML appender files to more reliably detect successful reloads ([b02e6a8](https://github.com/ptarmiganlabs/butler/commit/b02e6a86aa8f61ee2b9a78c85a569aad740c0543)), closes [#1259](https://github.com/ptarmiganlabs/butler/issues/1259)


### Miscellaneous

* Bump Docker build action to v6 ([6793cae](https://github.com/ptarmiganlabs/butler/commit/6793caea16a09f3c58b76659181dd05f64576d03))
* **deps:** Update dependencies ([e18ce59](https://github.com/ptarmiganlabs/butler/commit/e18ce59fa4f5485c62e668c699545a4191199d69))
* **deps:** Update dependencies to stay safe and secure ([16032c0](https://github.com/ptarmiganlabs/butler/commit/16032c079807b62ffe252158c57665b7d1627d85))
* **deps:** Upgrade dependencies to stay safe and secure ([2960da0](https://github.com/ptarmiganlabs/butler/commit/2960da0b4e274ade13a15a152cdcef306badcd70))
* **master:** release butler 13.0.0 ([f487c35](https://github.com/ptarmiganlabs/butler/commit/f487c35e8b6423d5f3e2412ec9313221378d3f3f))
* Update to use latest release-please action ([d0d8a62](https://github.com/ptarmiganlabs/butler/commit/d0d8a624b946f2eeee8bd0fac643cdb883fcb776))


### Refactoring

* **config:** Better verification of config file during startup ([d1ebfaa](https://github.com/ptarmiganlabs/butler/commit/d1ebfaa50e668b3b2e945aff48ceb2fc476235e4)), closes [#1236](https://github.com/ptarmiganlabs/butler/issues/1236)
* **config:** Get rid of old typos and outdated structure in config file ([985b749](https://github.com/ptarmiganlabs/butler/commit/985b74999014055dded7b5fd49d91c2a38966d57)), closes [#1242](https://github.com/ptarmiganlabs/butler/issues/1242)
* **config:** Remove support for "enabled" properties in config file, only support "enable". ([b3a9a40](https://github.com/ptarmiganlabs/butler/commit/b3a9a40a9f581d7e4df75e0acf1fcd4df0290b30)), closes [#1243](https://github.com/ptarmiganlabs/butler/issues/1243)

## [13.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v12.4.2...butler-v13.0.0) (2024-10-14)


### ⚠ BREAKING CHANGES

* **script-log:** Changing config fils structure to prep for future features
* **config:** Get rid of old typos and outdated structure in config file
* **ms-teams:** Use MS Power Automate for sending Teams messges

### Features

* **alert-templates:** Add more template variables to email, Slack, Teams alerts ([25aaa2b](https://github.com/ptarmiganlabs/butler/commit/25aaa2b189ff570c95b6042d56f2892cd04ed02f)), closes [#1250](https://github.com/ptarmiganlabs/butler/issues/1250)
* **alerts:** Add arbitrary URLs to reload failed/stopped/success msgs ([5e613db](https://github.com/ptarmiganlabs/butler/commit/5e613db4671a4cb9d4e53b6aa88a75249f4c8bd8)), closes [#1220](https://github.com/ptarmiganlabs/butler/issues/1220)
* **config-vis:** Show current config in web page ([b53eaf7](https://github.com/ptarmiganlabs/butler/commit/b53eaf7053e0319273c685afd6a400b370d1c7af)), closes [#1199](https://github.com/ptarmiganlabs/butler/issues/1199)
* **config:** Visualise config file in Butler hosted web page ([29356ce](https://github.com/ptarmiganlabs/butler/commit/29356ce36c9d6edf4a0b605b2b63be1c95fcaee3)), closes [#1199](https://github.com/ptarmiganlabs/butler/issues/1199)
* **email-alert:** Send email when select reload tasks finish successfully ([6a0e49b](https://github.com/ptarmiganlabs/butler/commit/6a0e49bae6172bf35f1ea366426a2486b0484d26)), closes [#1207](https://github.com/ptarmiganlabs/butler/issues/1207)
* **failed-task-alert:** Make failed reload task email look the same as QS Cloud ditto ([c163ad4](https://github.com/ptarmiganlabs/butler/commit/c163ad4c7d9769ea6e51e11bfb8b4a884a432fa1)), closes [#1237](https://github.com/ptarmiganlabs/butler/issues/1237)
* **qs-cloud:** Reload failed alerts to email ([1d4a62d](https://github.com/ptarmiganlabs/butler/commit/1d4a62d38f5ae8382c2b483c1af1faf4cf40902f))
* **qs-cloud:** Reload failed alerts to MS Teams ([523722a](https://github.com/ptarmiganlabs/butler/commit/523722a00a6a1c7c98ead806a171a6b14a388651))
* **qs-cloud:** Reload failed alerts to Slack ([fa35d91](https://github.com/ptarmiganlabs/butler/commit/fa35d91dc6993c2c32722425b1d3a66fef7f54df))
* Verify that needed email alert related custom properties exist in QS ([6babb0f](https://github.com/ptarmiganlabs/butler/commit/6babb0f1acffab2c80f88a98fa56984cd3aacd26)), closes [#1256](https://github.com/ptarmiganlabs/butler/issues/1256)


### Bug Fixes

* Fix error when sending successful reload email for apps and tasks with no tags associated with them ([c945493](https://github.com/ptarmiganlabs/butler/commit/c94549362c040670281f8650578276f1ce232a26))
* **ms-teams:** Use MS Power Automate for sending Teams messges ([4f46e60](https://github.com/ptarmiganlabs/butler/commit/4f46e6087641ff925b67e7c151bc1b9fc31a6d3a)), closes [#1239](https://github.com/ptarmiganlabs/butler/issues/1239)
* **scheduler:** Fix broken "scheduler" test case ([0012f6d](https://github.com/ptarmiganlabs/butler/commit/0012f6d1cc80d73df102f0aff660d5f09b609769)), closes [#1245](https://github.com/ptarmiganlabs/butler/issues/1245)
* **script-log:** Changing config fils structure to prep for future features ([e81ee39](https://github.com/ptarmiganlabs/butler/commit/e81ee39c85f17d87fd1a3d7d4db64327b1dd21a9))
* **service-alerts:** Update win service alert templates to latest look-n-feel ([b2e8bab](https://github.com/ptarmiganlabs/butler/commit/b2e8babd2e1f48a5d1cff99ad52d6f55567c6bb8)), closes [#1257](https://github.com/ptarmiganlabs/butler/issues/1257)
* **slack-alert:** Align Slack template for QSEoW alerts with QS Cloud ditto ([2769553](https://github.com/ptarmiganlabs/butler/commit/2769553e4ea10367d37c6d4e097299aaf6854c8f)), closes [#1238](https://github.com/ptarmiganlabs/butler/issues/1238)
* Test case "senseapp" now works again ([054faa6](https://github.com/ptarmiganlabs/butler/commit/054faa60bbff347dd49e0953cfddd75ea0e067c9)), closes [#1244](https://github.com/ptarmiganlabs/butler/issues/1244)
* **test:** Fix broken test of `buterping` API endpoint ([39827c8](https://github.com/ptarmiganlabs/butler/commit/39827c82852c5dc0eb0c54943279aa6f14c36c51))
* **winsvc-monitor:** Making verbose logging less spammy ([f8981b3](https://github.com/ptarmiganlabs/butler/commit/f8981b3d9b6611cc87821da4d9d94af154ee7e3b)), closes [#1234](https://github.com/ptarmiganlabs/butler/issues/1234)
* **xml-appender:** Update XML appender files to more reliably detect successful reloads ([b02e6a8](https://github.com/ptarmiganlabs/butler/commit/b02e6a86aa8f61ee2b9a78c85a569aad740c0543)), closes [#1259](https://github.com/ptarmiganlabs/butler/issues/1259)


### Miscellaneous

* Bump Docker build action to v6 ([6793cae](https://github.com/ptarmiganlabs/butler/commit/6793caea16a09f3c58b76659181dd05f64576d03))
* **deps:** Update dependencies ([e18ce59](https://github.com/ptarmiganlabs/butler/commit/e18ce59fa4f5485c62e668c699545a4191199d69))
* **deps:** Update dependencies to stay safe and secure ([16032c0](https://github.com/ptarmiganlabs/butler/commit/16032c079807b62ffe252158c57665b7d1627d85))
* **deps:** Upgrade dependencies to stay safe and secure ([2960da0](https://github.com/ptarmiganlabs/butler/commit/2960da0b4e274ade13a15a152cdcef306badcd70))
* Update to use latest release-please action ([d0d8a62](https://github.com/ptarmiganlabs/butler/commit/d0d8a624b946f2eeee8bd0fac643cdb883fcb776))


### Refactoring

* **config:** Better verification of config file during startup ([d1ebfaa](https://github.com/ptarmiganlabs/butler/commit/d1ebfaa50e668b3b2e945aff48ceb2fc476235e4)), closes [#1236](https://github.com/ptarmiganlabs/butler/issues/1236)
* **config:** Get rid of old typos and outdated structure in config file ([985b749](https://github.com/ptarmiganlabs/butler/commit/985b74999014055dded7b5fd49d91c2a38966d57)), closes [#1242](https://github.com/ptarmiganlabs/butler/issues/1242)
* **config:** Remove support for "enabled" properties in config file, only support "enable". ([b3a9a40](https://github.com/ptarmiganlabs/butler/commit/b3a9a40a9f581d7e4df75e0acf1fcd4df0290b30)), closes [#1243](https://github.com/ptarmiganlabs/butler/issues/1243)

## [12.4.2](https://github.com/ptarmiganlabs/butler/compare/butler-v12.4.1...butler-v12.4.2) (2024-07-03)


### Bug Fixes

* **host-info:** Correctly handle cases where there is no MAC addr available ([3aa250e](https://github.com/ptarmiganlabs/butler/commit/3aa250e3ad22be21986d702c653536a11ef00f52)), closes [#1183](https://github.com/ptarmiganlabs/butler/issues/1183)

## [12.4.1](https://github.com/ptarmiganlabs/butler/compare/butler-v12.4.0...butler-v12.4.1) (2024-07-03)


### Bug Fixes

* **host-info:** Add more verbose logging when getting host info fails ([41082ab](https://github.com/ptarmiganlabs/butler/commit/41082abfe3a3526cedc0ac21e789037df0e287fc))


### Miscellaneous

* Add auto-closing of issues in GitHub repo ([7e529d1](https://github.com/ptarmiganlabs/butler/commit/7e529d11da12aa8f976456691c18724dbcaedf22))
* **deps:** Upgrade dependencies ([8d8a68b](https://github.com/ptarmiganlabs/butler/commit/8d8a68b1df3dd74011d8d50797cfec074e88decf))

## [12.4.0](https://github.com/ptarmiganlabs/butler/compare/butler-v12.3.0...butler-v12.4.0) (2024-05-13)


### Features

* **config:** Make it easier to get started with Butler using the provided sample config file ([11007a4](https://github.com/ptarmiganlabs/butler/commit/11007a428aac6af61a745edebb77eca973d10292)), closes [#1143](https://github.com/ptarmiganlabs/butler/issues/1143)
* **qs-license:** Call webhook when Qlik Sense server license is about to expire ([660a5dc](https://github.com/ptarmiganlabs/butler/commit/660a5dc0ffbe425c636025fa09e28f97414338fb)), closes [#1136](https://github.com/ptarmiganlabs/butler/issues/1136)
* **qs-license:** Extract Sense server license info ([4cba793](https://github.com/ptarmiganlabs/butler/commit/4cba79304b8b9b1e1e52d1db4473988680ed5fc8)), closes [#805](https://github.com/ptarmiganlabs/butler/issues/805)
* **qs-license:** Send license expiration info to MQTT ([89684ea](https://github.com/ptarmiganlabs/butler/commit/89684eab916b634f7f14dd252aaa9b2f09509a6f)), closes [#1135](https://github.com/ptarmiganlabs/butler/issues/1135)
* **qs-version:** Add Qlik Sense version logging to InfluxDb ([19a4eb7](https://github.com/ptarmiganlabs/butler/commit/19a4eb77c32a61f845ab2ede0a080ed0db8d97b7)), closes [#1123](https://github.com/ptarmiganlabs/butler/issues/1123)


### Bug Fixes

* **api-doc:** Get rid of errors when generating API docs ([30553f2](https://github.com/ptarmiganlabs/butler/commit/30553f213805f04c244505ef3c0f2a84ede80a54)), closes [#1144](https://github.com/ptarmiganlabs/butler/issues/1144)
* **qs-version:** Log Sense server version to console every time it is retrieved ([97e965a](https://github.com/ptarmiganlabs/butler/commit/97e965a8cc97cd89b1c8f56ca1b5e4af50f1c976))


### Miscellaneous

* **deps:** Update dependencies ([e3aa05f](https://github.com/ptarmiganlabs/butler/commit/e3aa05f4c5dd64ed49e1a4fbc842a3683a35efde))
* **deps:** Update dependencies ([ec4e8f0](https://github.com/ptarmiganlabs/butler/commit/ec4e8f0593bff2b42c0c8bc9b551513eba67ff70))
* Fix broken 12.2.1 build ([032f1f7](https://github.com/ptarmiganlabs/butler/commit/032f1f7f9d07319b8694f0ed1ab88e4c24d2e36f))
* **master:** release butler 12.3.0 ([31f3251](https://github.com/ptarmiganlabs/butler/commit/31f325102fcce5892530d7ff0ebed900df7afe93))


### Refactoring

* Fix various typos, code formatting and style issues ([caf9439](https://github.com/ptarmiganlabs/butler/commit/caf9439d022e8c7ae68a35936301e92a6b826b8e))

## [12.3.0](https://github.com/ptarmiganlabs/butler/compare/butler-v12.3.0...butler-v12.3.0) (2024-04-25)


### Miscellaneous

* Fix broken 12.2.1 build ([032f1f7](https://github.com/ptarmiganlabs/butler/commit/032f1f7f9d07319b8694f0ed1ab88e4c24d2e36f))

## [12.3.0](https://github.com/ptarmiganlabs/butler/compare/butler-v12.2.1...butler-v12.3.0) (2024-04-24)


### Features

* **config:** Add cmd line option "--skip-config-verification" ([f0795fc](https://github.com/ptarmiganlabs/butler/commit/f0795fcae196bb62c80abd15351f3b228c472900)), closes [#1114](https://github.com/ptarmiganlabs/butler/issues/1114)


### Bug Fixes

* **config:** Incorrect startup validation of New Relic tags in config file ([ced7aa9](https://github.com/ptarmiganlabs/butler/commit/ced7aa9c7701f25c632031a2582ae9bb1b16f836)), closes [#1113](https://github.com/ptarmiganlabs/butler/issues/1113)

## [12.2.1](https://github.com/ptarmiganlabs/butler/compare/butler-v12.2.0...butler-v12.2.1) (2024-04-24)


### Bug Fixes

* **config:** Add missing, mandatory entries to sample config file ([c7c9ac3](https://github.com/ptarmiganlabs/butler/commit/c7c9ac3d6e5e96be2b97309feaa6ceb561572641)), closes [#1108](https://github.com/ptarmiganlabs/butler/issues/1108)

## [12.2.0](https://github.com/ptarmiganlabs/butler/compare/butler-v12.1.1...butler-v12.2.0) (2024-04-23)


### Features

* **qs-license:** More options for auto-release of unused Sense access licenses ([8eece16](https://github.com/ptarmiganlabs/butler/commit/8eece163b9feb3e667ba3d5ac64802d7632e6bbd))


### Miscellaneous

* **deps:** Update dependencies ([96cfe34](https://github.com/ptarmiganlabs/butler/commit/96cfe345d2e79b611051e5e4e1d77ed28c6d0779))

## [12.1.1](https://github.com/ptarmiganlabs/butler/compare/butler-v12.1.0...butler-v12.1.1) (2024-04-17)


### Bug Fixes

* **qs-license:** Correct license type names written to InfluxDB when releasing QS licenses ([1cd59f2](https://github.com/ptarmiganlabs/butler/commit/1cd59f205b782834b81de11791b99c0489b9a99a)), closes [#1094](https://github.com/ptarmiganlabs/butler/issues/1094)

## [12.1.0](https://github.com/ptarmiganlabs/butler/compare/butler-v12.0.0...butler-v12.1.0) (2024-04-15)


### Features

* **config:** Much improved verification of config file on startup ([5dc1a23](https://github.com/ptarmiganlabs/butler/commit/5dc1a231b0b79e9aeab4ae4bd120f959a51c8bc7)), closes [#1090](https://github.com/ptarmiganlabs/butler/issues/1090)


### Bug Fixes

* Fix api docs config file wrt assert code ([fdd5902](https://github.com/ptarmiganlabs/butler/commit/fdd5902f78fc330cd2e83453cc67e24f002fe27f))
* **webhook:** Allow empty arrays of webhooks in config file ([4f354b8](https://github.com/ptarmiganlabs/butler/commit/4f354b8f4e829db5cda472b47676b68f339bc5f0)), closes [#1088](https://github.com/ptarmiganlabs/butler/issues/1088)

## [12.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v11.2.0...butler-v12.0.0) (2024-04-12)


### ⚠ BREAKING CHANGES

* **qs-license:** Align field names used to store QS license data to existing field names in the database.

### Bug Fixes

* **qs-license:** Align field names used to store QS license data to existing field names in the database. ([2694d12](https://github.com/ptarmiganlabs/butler/commit/2694d125531e20d59aa989a83f9ab31e05b949b1)), closes [#1084](https://github.com/ptarmiganlabs/butler/issues/1084)
* **qs-license:** Write correct license type tags to InfluxDB ([e550dea](https://github.com/ptarmiganlabs/butler/commit/e550deae88a813bbe8e1a7b17ce2f4bc3e6105ad)), closes [#1085](https://github.com/ptarmiganlabs/butler/issues/1085)


### Miscellaneous

* **deps:** update dependencies ([165df1b](https://github.com/ptarmiganlabs/butler/commit/165df1b11f4344442e1a014e84a271f84b946160))

## [11.2.0](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.5...butler-v11.2.0) (2024-04-12)


### Features

* **webhook:** add optional https support for outgoing webhooks ([d4cd3dd](https://github.com/ptarmiganlabs/butler/commit/d4cd3dd672950245965cc3ccaecf56fc9b5c44b4)), closes [#1040](https://github.com/ptarmiganlabs/butler/issues/1040)


### Bug Fixes

* **webhook:** Added better error logging for failed webhook requests ([1c96ed6](https://github.com/ptarmiganlabs/butler/commit/1c96ed65ddef7827e6486785af8a25837483b4b1)), closes [#1081](https://github.com/ptarmiganlabs/butler/issues/1081)

## [11.1.5](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.4...butler-v11.1.5) (2024-04-09)


### Bug Fixes

* Add config file template to Windows zip ([2510f55](https://github.com/ptarmiganlabs/butler/commit/2510f55b7eabc68d941f7f46b973f95dca36d2d0))


### Miscellaneous

* **deps:** Upgrade dependencies ([243caa3](https://github.com/ptarmiganlabs/butler/commit/243caa3921e46cda57b96dea57335ca2e7dc46c4))

## [11.1.4](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.3...butler-v11.1.4) (2024-04-08)


### Miscellaneous

* Docker image build ([72ca27e](https://github.com/ptarmiganlabs/butler/commit/72ca27e4c7451ce9a747bf8415351f7c7f304848))
* Fix broken Docker build ([09ddf62](https://github.com/ptarmiganlabs/butler/commit/09ddf620d1ba04872bee74de060f795d64fcc088))
* **master:** release butler 11.1.3 ([2fb2075](https://github.com/ptarmiganlabs/butler/commit/2fb2075625bfcbb0e299fb2819d65cb7182c558b))

## [11.1.3](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.3...butler-v11.1.3) (2024-04-08)


### Miscellaneous

* Docker image build ([72ca27e](https://github.com/ptarmiganlabs/butler/commit/72ca27e4c7451ce9a747bf8415351f7c7f304848))

## [11.1.3](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.3...butler-v11.1.3) (2024-04-08)


### Miscellaneous

* Adopt to new Release-Please version ([0efc975](https://github.com/ptarmiganlabs/butler/commit/0efc97588e05a660a1d67103d5abd0855761f373))
* **deps:** Update dependencies ([cc7bf2c](https://github.com/ptarmiganlabs/butler/commit/cc7bf2c7e733b4d473f6adec98ca03b8bcf0b12a))
* Fix broken Docker image build and update versioning to 1.2.3 format ([7e96da5](https://github.com/ptarmiganlabs/butler/commit/7e96da51aea3203c038888b5bb4a8839359d8418))
* **master:** release butler 11.1.2 ([c0b8250](https://github.com/ptarmiganlabs/butler/commit/c0b82506e0ee683e4565f5084a9dd6698f526e9e))
* **master:** release butler 11.1.3 ([211a511](https://github.com/ptarmiganlabs/butler/commit/211a5117d84c3d824ece7f2b5a6d28ede6d3e0e5))
* Tweak Docker image building ([dab2395](https://github.com/ptarmiganlabs/butler/commit/dab23958c2e6b31c155051f6e327e75e7409ec72))

## [11.1.3](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.2...butler-v11.1.3) (2024-04-08)


### Miscellaneous

* **deps:** Update dependencies ([cc7bf2c](https://github.com/ptarmiganlabs/butler/commit/cc7bf2c7e733b4d473f6adec98ca03b8bcf0b12a))
* Fix broken Docker image build and update versioning to 1.2.3 format ([7e96da5](https://github.com/ptarmiganlabs/butler/commit/7e96da51aea3203c038888b5bb4a8839359d8418))
* **master:** release butler 11.1.2 ([c0b8250](https://github.com/ptarmiganlabs/butler/commit/c0b82506e0ee683e4565f5084a9dd6698f526e9e))
* Tweak Docker image building ([dab2395](https://github.com/ptarmiganlabs/butler/commit/dab23958c2e6b31c155051f6e327e75e7409ec72))

## [11.1.2](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.2...butler-v11.1.2) (2024-04-08)


### Miscellaneous

* Debug Docker image build code in GitHub Actions ([db36afa](https://github.com/ptarmiganlabs/butler/commit/db36afa25c83182c86285aba0aff9f9337e10385))
* Debug Docker image bulild code ([c9748e1](https://github.com/ptarmiganlabs/butler/commit/c9748e1da2eca65632f8d28f148cc46fc455e28b))
* **deps:** Update dependencies ([cc7bf2c](https://github.com/ptarmiganlabs/butler/commit/cc7bf2c7e733b4d473f6adec98ca03b8bcf0b12a))
* Docker build debug ([d4dc1b8](https://github.com/ptarmiganlabs/butler/commit/d4dc1b87fdcae0f4033380686cf165aeb70ba172))
* Fix broken Docker image build and update versioning to 1.2.3 format ([7e96da5](https://github.com/ptarmiganlabs/butler/commit/7e96da51aea3203c038888b5bb4a8839359d8418))
* **master:** release butler 11.1.1 ([46707ff](https://github.com/ptarmiganlabs/butler/commit/46707ff84bfd4db54ee1d814ae2add3465946079))
* **master:** release butler 11.1.2 ([242c347](https://github.com/ptarmiganlabs/butler/commit/242c3477c530ef4a0047a324c84a68388cc23006))
* **master:** release butler 11.1.2 ([049a938](https://github.com/ptarmiganlabs/butler/commit/049a938a3de07fc7e8983c62851d4cdece67cab4))

## [11.1.2](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.2...butler-v11.1.2) (2024-04-08)


### Miscellaneous

* Debug Docker image build code in GitHub Actions ([db36afa](https://github.com/ptarmiganlabs/butler/commit/db36afa25c83182c86285aba0aff9f9337e10385))
* Debug Docker image bulild code ([c9748e1](https://github.com/ptarmiganlabs/butler/commit/c9748e1da2eca65632f8d28f148cc46fc455e28b))
* Docker build debug ([d4dc1b8](https://github.com/ptarmiganlabs/butler/commit/d4dc1b87fdcae0f4033380686cf165aeb70ba172))
* **master:** release butler 11.1.1 ([46707ff](https://github.com/ptarmiganlabs/butler/commit/46707ff84bfd4db54ee1d814ae2add3465946079))
* **master:** release butler 11.1.2 ([049a938](https://github.com/ptarmiganlabs/butler/commit/049a938a3de07fc7e8983c62851d4cdece67cab4))

## [11.1.2](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.1...butler-v11.1.2) (2024-04-08)


### Miscellaneous

* Debug Docker image build code in GitHub Actions ([db36afa](https://github.com/ptarmiganlabs/butler/commit/db36afa25c83182c86285aba0aff9f9337e10385))

## [11.1.1](https://github.com/ptarmiganlabs/butler/compare/butler-v11.1.0...butler-v11.1.1) (2024-04-08)


### Miscellaneous

* Docker build debug ([d4dc1b8](https://github.com/ptarmiganlabs/butler/commit/d4dc1b87fdcae0f4033380686cf165aeb70ba172))

## [11.1.0](https://github.com/ptarmiganlabs/butler/compare/butler-v11.0.3...butler-v11.1.0) (2024-04-08)


### Features

* **license:** Monitor high level Qilk Sense license usage across different license types ([2c925b7](https://github.com/ptarmiganlabs/butler/commit/2c925b70230f0be82f258b11eb8d24c927f12ebb)), closes [#1041](https://github.com/ptarmiganlabs/butler/issues/1041)
* Scheduled removal of unused user Qlik Sense license ([bac1258](https://github.com/ptarmiganlabs/butler/commit/bac12589f8e147039830cdac4f906a6061d2959f)), closes [#1042](https://github.com/ptarmiganlabs/butler/issues/1042)


### Bug Fixes

* Better, more complete check of config when starting Butler ([1e769dd](https://github.com/ptarmiganlabs/butler/commit/1e769ddfe745882ea109f2962c9b7b4986b04cbd))
* Make handling of reload failed/aborted/succeeded messages more robust ([eaf609e](https://github.com/ptarmiganlabs/butler/commit/eaf609e67a41d3c0020654e26a64c5a7a5c5af2b)), closes [#1034](https://github.com/ptarmiganlabs/butler/issues/1034)
* Remove Node.js warnings on Butler startup ([e489d4b](https://github.com/ptarmiganlabs/butler/commit/e489d4b56ec57de3ff18be72828ffc65d09f6912)), closes [#1037](https://github.com/ptarmiganlabs/butler/issues/1037)
* **startup:** More consistent logging during startup ([e0cce7b](https://github.com/ptarmiganlabs/butler/commit/e0cce7b7b12bbe5136864f8721b9ddcddadc6e29)), closes [#991](https://github.com/ptarmiganlabs/butler/issues/991)
* Tidy up formatting of startup info written to logs ([c337aa1](https://github.com/ptarmiganlabs/butler/commit/c337aa1f0279f07319523b02e72685c24a83de0b)), closes [#991](https://github.com/ptarmiganlabs/butler/issues/991)


### Miscellaneous

* **deps:** Update dependencies ([0c5890e](https://github.com/ptarmiganlabs/butler/commit/0c5890e646de0da34ebd2ac9af94828cdbbe761c))
* **deps:** Update dependencies ([fc4c34c](https://github.com/ptarmiganlabs/butler/commit/fc4c34cb96a6b9f3bd87ec2e91450e5ddc799e23))
* **master:** release butler 11.0.3 ([f15dfe5](https://github.com/ptarmiganlabs/butler/commit/f15dfe5fbbf81ec1b06164d97747e128b04d4672))
* Optimize GH Actions for building binaries ([cfc024f](https://github.com/ptarmiganlabs/butler/commit/cfc024f0d4dab7e741eaf884c7b5a2a0deca68cf))
* Remove udp client from Butler project, move to its own repo ([70817f0](https://github.com/ptarmiganlabs/butler/commit/70817f0a97c9034519cca16b16554d9d077c98a8))
* Sign Win binaries with new signing solution ([e8e91d5](https://github.com/ptarmiganlabs/butler/commit/e8e91d5e8b260db9d065b55a2d83549961ac8684)), closes [#1004](https://github.com/ptarmiganlabs/butler/issues/1004)

## [11.0.3](https://github.com/ptarmiganlabs/butler/compare/butler-v11.0.2...butler-v11.0.3) (2024-02-18)


### Bug Fixes

* **startup:** More consistent logging during startup ([e0cce7b](https://github.com/ptarmiganlabs/butler/commit/e0cce7b7b12bbe5136864f8721b9ddcddadc6e29)), closes [#991](https://github.com/ptarmiganlabs/butler/issues/991)
* Tidy up formatting of startup info written to logs ([c337aa1](https://github.com/ptarmiganlabs/butler/commit/c337aa1f0279f07319523b02e72685c24a83de0b)), closes [#991](https://github.com/ptarmiganlabs/butler/issues/991)


### Miscellaneous

* **deps:** Update dependencies ([fc4c34c](https://github.com/ptarmiganlabs/butler/commit/fc4c34cb96a6b9f3bd87ec2e91450e5ddc799e23))
* Optimize GH Actions for building binaries ([cfc024f](https://github.com/ptarmiganlabs/butler/commit/cfc024f0d4dab7e741eaf884c7b5a2a0deca68cf))
* Sign Win binaries with new signing solution ([e8e91d5](https://github.com/ptarmiganlabs/butler/commit/e8e91d5e8b260db9d065b55a2d83549961ac8684)), closes [#1004](https://github.com/ptarmiganlabs/butler/issues/1004)

## [11.0.2](https://github.com/ptarmiganlabs/butler/compare/v11.0.1...v11.0.2) (2024-02-01)


### Bug Fixes

* Debug GHA ([3d053b8](https://github.com/ptarmiganlabs/butler/commit/3d053b815637dd6f153a3c64dc07a3da94ce7b7c))

## [11.0.1](https://github.com/ptarmiganlabs/butler/compare/v11.0.0...v11.0.1) (2024-02-01)


### Bug Fixes

* Debugging GH actions ([7f9befd](https://github.com/ptarmiganlabs/butler/commit/7f9befd549541060a9b0e948e9d16e0cf1776dd3))

## [11.0.0](https://github.com/ptarmiganlabs/butler/compare/v10.0.0...v11.0.0) (2024-02-01)


### ⚠ BREAKING CHANGES

* Major rewrite, switching to ECMAScript instead of CJS.
* Move InfluxDB settings to their own section in config file

### Features

* Add InfluxDB as destination for Windows service status monitoring ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab))
* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* Add monitoring of Windows services ([76247a1](https://github.com/ptarmiganlabs/butler/commit/76247a1106779011e6ed0b6a5538c0aec49a8973)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* **build:** Create better API docs ([9bad21a](https://github.com/ptarmiganlabs/butler/commit/9bad21ab2b5d2f2ff282506671662b6f713bae52)), closes [#644](https://github.com/ptarmiganlabs/butler/issues/644)
* **influxdb:** Add Butler version tag to uptime data sent to InfluxDb ([e60528a](https://github.com/ptarmiganlabs/butler/commit/e60528a7848bc66652cc505156a1e060bfef8aff)), closes [#919](https://github.com/ptarmiganlabs/butler/issues/919)
* **influxdb:** Store failed reload info in InfluxDB ([b45dedd](https://github.com/ptarmiganlabs/butler/commit/b45deddf3f3ec0a2b5337343fe8cc873ccad3acf)), closes [#866](https://github.com/ptarmiganlabs/butler/issues/866)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* Move InfluxDB settings to their own section in config file ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab)), closes [#670](https://github.com/ptarmiganlabs/butler/issues/670)
* **mqtt:** Add support for Azure Event Grid as MQTT broker ([3794da3](https://github.com/ptarmiganlabs/butler/commit/3794da32a8f80e45217e1bde72b39a327995a390))
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)
* Only get script log once from Sense server ([f193538](https://github.com/ptarmiganlabs/butler/commit/f19353809e44f17fcce5be3eca1ff5cc0c2925c6)), closes [#741](https://github.com/ptarmiganlabs/butler/issues/741)
* **reload-alerts:** Make app owner info available in reload failed alerts ([1912d3e](https://github.com/ptarmiganlabs/butler/commit/1912d3e0c515ede34bebfc1d0ec048a17054ee79)), closes [#728](https://github.com/ptarmiganlabs/butler/issues/728)
* Store reload task success info in InfluxBD ([e642ad4](https://github.com/ptarmiganlabs/butler/commit/e642ad4791605eaa64a4b2368928befbe40d23f4)), closes [#870](https://github.com/ptarmiganlabs/butler/issues/870)
* **telemetry:** Change to using PostHog for telemetry collection ([4da339a](https://github.com/ptarmiganlabs/butler/commit/4da339ae3f7d9ce7d3e9fc24ddd442fc19157c7d)), closes [#744](https://github.com/ptarmiganlabs/butler/issues/744)
* Verify structure of config file on Butler startup ([69e35ff](https://github.com/ptarmiganlabs/butler/commit/69e35ff960f6296f0f3e9c02f50c05bfc0c17a42)), closes [#675](https://github.com/ptarmiganlabs/butler/issues/675)


### Bug Fixes

* Add missing fields to template config file ([157f715](https://github.com/ptarmiganlabs/butler/commit/157f715b27d8640428506944c52c1bd05d1cdb77))
* Add verbose logging showing which NR accounts are used ([907b9ae](https://github.com/ptarmiganlabs/butler/commit/907b9aeb3c135a03c34ba592d45192a2c3c98b2b))
* **alerts:** Empty alert recipient lists no longer cause errors ([34421ce](https://github.com/ptarmiganlabs/butler/commit/34421cec7d60c1a1569c5a896ac634f3189370c7)), closes [#640](https://github.com/ptarmiganlabs/butler/issues/640)
* Allow empty New Relic settings in config file's uptime section ([1de18e7](https://github.com/ptarmiganlabs/butler/commit/1de18e7bec819f3d124f77a1051269d067486d86)), closes [#562](https://github.com/ptarmiganlabs/butler/issues/562)
* Allow uptime reporting to New Relic without custom http headers ([f455a38](https://github.com/ptarmiganlabs/butler/commit/f455a38d23b93fc6cd70b716d8a8eb3227cdf4cb)), closes [#587](https://github.com/ptarmiganlabs/butler/issues/587)
* Automatic dependencies scanning ([1d8201d](https://github.com/ptarmiganlabs/butler/commit/1d8201dcd0bf469e3690687f27260de61cbc739a))
* Better log messages when rate limiting for reload notifications passes ([0ee04fb](https://github.com/ptarmiganlabs/butler/commit/0ee04fb40b1a52b415203c42e9eee2a95068cef1)), closes [#571](https://github.com/ptarmiganlabs/butler/issues/571)
* Correctly report Docker status ([72e1087](https://github.com/ptarmiganlabs/butler/commit/72e1087ed94ffa6ddcd6b913a87373aebe39f5d3)), closes [#939](https://github.com/ptarmiganlabs/butler/issues/939)
* **deps:** update dependency @fastify/swagger to v8.9.0 ([b0f5440](https://github.com/ptarmiganlabs/butler/commit/b0f54400a3505b188fe6e5a5a4b6ac45b843f09f))
* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))
* Disable SMTP mail appender in sample config ([4f63cb3](https://github.com/ptarmiganlabs/butler/commit/4f63cb34cab19aa1b077de867c19c7c3e0ccc890))
* **disk-util:** All subdirs under approved dirs are also approved ([0ecc402](https://github.com/ptarmiganlabs/butler/commit/0ecc402c8ef56a85a88b08883f0e2330bda79949)), closes [#831](https://github.com/ptarmiganlabs/butler/issues/831)
* **docker:** Docker image build fixed ([d230e14](https://github.com/ptarmiganlabs/butler/commit/d230e14085f297194ed8c3053293654d3c2931bd))
* **docker:** Fix broken Docker image ([85f016e](https://github.com/ptarmiganlabs/butler/commit/85f016ec6ed8fbfa4163d5d6b4dfbe8417bab2a6)), closes [#764](https://github.com/ptarmiganlabs/butler/issues/764)
* Enable Teams notif for Win service monitor now works ([a0761cb](https://github.com/ptarmiganlabs/butler/commit/a0761cb155ff96192e586f07dfec590fa81e41bd)), closes [#758](https://github.com/ptarmiganlabs/butler/issues/758)
* Improve warning when custom property names in config file don't exist in Sense ([a53cbe8](https://github.com/ptarmiganlabs/butler/commit/a53cbe8d581b14571d61508112dc0e0915cb17e7)), closes [#586](https://github.com/ptarmiganlabs/butler/issues/586)
* Improve Winsvc checking efficiency ([e9a1ff5](https://github.com/ptarmiganlabs/butler/commit/e9a1ff512ade5af87b2613ae716ff32c3719ad15))
* Make path resoultion for QIX schema files more robust ([568aa2e](https://github.com/ptarmiganlabs/butler/commit/568aa2eeb3997bf2d5c344cd3313c1e8d42c5d06))
* More robust generation of anonymous Butler instance id ([5203d54](https://github.com/ptarmiganlabs/butler/commit/5203d549059f1726deeeb74c89c98eeb715e569b)), closes [#863](https://github.com/ptarmiganlabs/butler/issues/863)
* **mqtt:** Better error handling when establishing MQTT connection ([6299a2c](https://github.com/ptarmiganlabs/butler/commit/6299a2ccb5e64703c15cc56cafb59d5290692f8f))
* **mqtt:** Better logging and check for cert existence ([59dc4fa](https://github.com/ptarmiganlabs/butler/commit/59dc4fa0706de5a47c2f67cf75cae3964c516732))
* **mqtt:** Don't show MQTT startup info when MQTT is disabled ([7f48bd3](https://github.com/ptarmiganlabs/butler/commit/7f48bd3f72433ea7b89bbeaebdbee7bffa97017c)), closes [#913](https://github.com/ptarmiganlabs/butler/issues/913)
* **mqtt:** More reboust startup code for MQTT & Win svc monitoring ([577dba3](https://github.com/ptarmiganlabs/butler/commit/577dba39b253533a5e128ebeacdfa2b81be2a4fa)), closes [#897](https://github.com/ptarmiganlabs/butler/issues/897)
* **new-relic:** Send task failed event to New Relic ([154a921](https://github.com/ptarmiganlabs/butler/commit/154a921f8e8d406744a7f9aa46416dec6bd20b68)), closes [#750](https://github.com/ptarmiganlabs/butler/issues/750)
* Only initiate InfluxDB connection if it's actually enabled in config file ([ba35605](https://github.com/ptarmiganlabs/butler/commit/ba3560559881cd62daf6f590ba7cde9e3f1a116e)), closes [#678](https://github.com/ptarmiganlabs/butler/issues/678)
* Only send to New Relic if event/log is enabled AND custom property name specified. ([9fc81d0](https://github.com/ptarmiganlabs/butler/commit/9fc81d05c90a862cd477d90d25109b57e968bebc)), closes [#596](https://github.com/ptarmiganlabs/butler/issues/596)
* Only set up REST server if it's actually enabled in the config file ([7746cee](https://github.com/ptarmiganlabs/butler/commit/7746ceea5281342745864e241a58688385d04b55)), closes [#679](https://github.com/ptarmiganlabs/butler/issues/679)
* **smtp:** Add  verbose log of email recipients ([8d4ad93](https://github.com/ptarmiganlabs/butler/commit/8d4ad9308f44c876d2ecb335ee84448a99ae0d57))
* Typos in Slack/Teams notifrication log messages ([e28b715](https://github.com/ptarmiganlabs/butler/commit/e28b7157a9378ee82af61772a165b80abf4d902b)), closes [#794](https://github.com/ptarmiganlabs/butler/issues/794)
* Verify that all required config file entries exist ([38c42b0](https://github.com/ptarmiganlabs/butler/commit/38c42b0175d7668574fff69fe1ec424350d95e34)), closes [#874](https://github.com/ptarmiganlabs/butler/issues/874)
* **webhook:** Deal with empty webhook list wo errors ([3f42d02](https://github.com/ptarmiganlabs/butler/commit/3f42d02ba7b0a6a7afd5d03ce7983685cb1adc62)), closes [#944](https://github.com/ptarmiganlabs/butler/issues/944)
* **win-svc-monitor:** Fix typo in log output from config file sanity check. ([37d02b3](https://github.com/ptarmiganlabs/butler/commit/37d02b3ef6b65c893432951164f249ef7a3ce411)), closes [#708](https://github.com/ptarmiganlabs/butler/issues/708)
* **winservice:** Better handling of services that don't exist ([56a18de](https://github.com/ptarmiganlabs/butler/commit/56a18de4627b0e45cf25677bee0a5e09b1559a8c))
* **winsvc:** Bug fixes and better logging for win service monitoring ([dc76b63](https://github.com/ptarmiganlabs/butler/commit/dc76b63875bb6255649c214947694f1153d3afe4))
* **winsvc:** Don't send Win svc alerts when Butler starts ([d716cfe](https://github.com/ptarmiganlabs/butler/commit/d716cfe2d1241a84be8349f75accd360b28e3978)), closes [#896](https://github.com/ptarmiganlabs/butler/issues/896)
* **winsvc:** Make Windows service status checks quicker ([001f99f](https://github.com/ptarmiganlabs/butler/commit/001f99fe2bc20d21674868b43133be73e474f77b)), closes [#912](https://github.com/ptarmiganlabs/butler/issues/912)
* **winsvc:** Optimize windows services checks ([47e08ad](https://github.com/ptarmiganlabs/butler/commit/47e08ad03a2cbff8a653403c111b2f8befcff4e7))
* **winsvc:** Win service monitoring no longer rely on New Relic ([e47124c](https://github.com/ptarmiganlabs/butler/commit/e47124cd3a5606e4ce308a679cc49ba9267dfdcd)), closes [#967](https://github.com/ptarmiganlabs/butler/issues/967)


### Code Refactoring

* Major rewrite, switching to ECMAScript instead of CJS. ([25f0ab2](https://github.com/ptarmiganlabs/butler/commit/25f0ab2a2905e1895162c33bfb54732e526027b0)), closes [#942](https://github.com/ptarmiganlabs/butler/issues/942)

## [10.0.0](https://github.com/ptarmiganlabs/butler/compare/v9.4.0...v10.0.0) (2024-01-30)


### ⚠ BREAKING CHANGES

* Major rewrite, switching to ECMAScript instead of CJS.

### Bug Fixes

* Correctly report Docker status ([72e1087](https://github.com/ptarmiganlabs/butler/commit/72e1087ed94ffa6ddcd6b913a87373aebe39f5d3)), closes [#939](https://github.com/ptarmiganlabs/butler/issues/939)
* Make path resoultion for QIX schema files more robust ([568aa2e](https://github.com/ptarmiganlabs/butler/commit/568aa2eeb3997bf2d5c344cd3313c1e8d42c5d06))
* **mqtt:** Better logging and check for cert existence ([59dc4fa](https://github.com/ptarmiganlabs/butler/commit/59dc4fa0706de5a47c2f67cf75cae3964c516732))
* **webhook:** Deal with empty webhook list wo errors ([3f42d02](https://github.com/ptarmiganlabs/butler/commit/3f42d02ba7b0a6a7afd5d03ce7983685cb1adc62)), closes [#944](https://github.com/ptarmiganlabs/butler/issues/944)


### Code Refactoring

* Major rewrite, switching to ECMAScript instead of CJS. ([25f0ab2](https://github.com/ptarmiganlabs/butler/commit/25f0ab2a2905e1895162c33bfb54732e526027b0)), closes [#942](https://github.com/ptarmiganlabs/butler/issues/942)

## [9.4.0](https://github.com/ptarmiganlabs/butler/compare/v9.3.2...v9.4.0) (2023-12-13)


### Features

* **influxdb:** Add Butler version tag to uptime data sent to InfluxDb ([e60528a](https://github.com/ptarmiganlabs/butler/commit/e60528a7848bc66652cc505156a1e060bfef8aff)), closes [#919](https://github.com/ptarmiganlabs/butler/issues/919)


### Bug Fixes

* Improve Winsvc checking efficiency ([e9a1ff5](https://github.com/ptarmiganlabs/butler/commit/e9a1ff512ade5af87b2613ae716ff32c3719ad15))
* **winsvc:** Optimize windows services checks ([47e08ad](https://github.com/ptarmiganlabs/butler/commit/47e08ad03a2cbff8a653403c111b2f8befcff4e7))

## [9.3.2](https://github.com/ptarmiganlabs/butler/compare/v9.3.1...v9.3.2) (2023-12-12)


### Bug Fixes

* **mqtt:** Don't show MQTT startup info when MQTT is disabled ([7f48bd3](https://github.com/ptarmiganlabs/butler/commit/7f48bd3f72433ea7b89bbeaebdbee7bffa97017c)), closes [#913](https://github.com/ptarmiganlabs/butler/issues/913)
* **winsvc:** Bug fixes and better logging for win service monitoring ([dc76b63](https://github.com/ptarmiganlabs/butler/commit/dc76b63875bb6255649c214947694f1153d3afe4))
* **winsvc:** Make Windows service status checks quicker ([001f99f](https://github.com/ptarmiganlabs/butler/commit/001f99fe2bc20d21674868b43133be73e474f77b)), closes [#912](https://github.com/ptarmiganlabs/butler/issues/912)


### Miscellaneous

* **deps:** Update dependencies to stay safe & secure ([f6389dd](https://github.com/ptarmiganlabs/butler/commit/f6389dd671ab56e3910b04391aaf818c6b3c9aea))

## [9.3.1](https://github.com/ptarmiganlabs/butler/compare/v9.3.0...v9.3.1) (2023-12-07)


### Bug Fixes

* **mqtt:** More reboust startup code for MQTT & Win svc monitoring ([577dba3](https://github.com/ptarmiganlabs/butler/commit/577dba39b253533a5e128ebeacdfa2b81be2a4fa)), closes [#897](https://github.com/ptarmiganlabs/butler/issues/897)
* **winsvc:** Don't send Win svc alerts when Butler starts ([d716cfe](https://github.com/ptarmiganlabs/butler/commit/d716cfe2d1241a84be8349f75accd360b28e3978)), closes [#896](https://github.com/ptarmiganlabs/butler/issues/896)


### Refactoring

* **logging:** More consistent log prefixes ([f0621af](https://github.com/ptarmiganlabs/butler/commit/f0621af52f49027816b98c25728121d475a2daf0)), closes [#895](https://github.com/ptarmiganlabs/butler/issues/895)

## [9.3.0](https://github.com/ptarmiganlabs/butler/compare/v9.3.0...v9.3.0) (2023-12-06)


### Features

* **influxdb:** Store failed reload info in InfluxDB ([b45dedd](https://github.com/ptarmiganlabs/butler/commit/b45deddf3f3ec0a2b5337343fe8cc873ccad3acf)), closes [#866](https://github.com/ptarmiganlabs/butler/issues/866)
* **mqtt:** Add support for Azure Event Grid as MQTT broker ([3794da3](https://github.com/ptarmiganlabs/butler/commit/3794da32a8f80e45217e1bde72b39a327995a390))
* Store reload task success info in InfluxBD ([e642ad4](https://github.com/ptarmiganlabs/butler/commit/e642ad4791605eaa64a4b2368928befbe40d23f4)), closes [#870](https://github.com/ptarmiganlabs/butler/issues/870)


### Bug Fixes

* Disable SMTP mail appender in sample config ([4f63cb3](https://github.com/ptarmiganlabs/butler/commit/4f63cb34cab19aa1b077de867c19c7c3e0ccc890))
* More robust generation of anonymous Butler instance id ([5203d54](https://github.com/ptarmiganlabs/butler/commit/5203d549059f1726deeeb74c89c98eeb715e569b)), closes [#863](https://github.com/ptarmiganlabs/butler/issues/863)
* **mqtt:** Better error handling when establishing MQTT connection ([6299a2c](https://github.com/ptarmiganlabs/butler/commit/6299a2ccb5e64703c15cc56cafb59d5290692f8f))
* Verify that all required config file entries exist ([38c42b0](https://github.com/ptarmiganlabs/butler/commit/38c42b0175d7668574fff69fe1ec424350d95e34)), closes [#874](https://github.com/ptarmiganlabs/butler/issues/874)
* **winservice:** Better handling of services that don't exist ([56a18de](https://github.com/ptarmiganlabs/butler/commit/56a18de4627b0e45cf25677bee0a5e09b1559a8c))


### Miscellaneous

* Add sample config files to release ZIPs ([03f2fdf](https://github.com/ptarmiganlabs/butler/commit/03f2fdf25b8155bd5dec36f5ea9d4cfef9a921f4)), closes [#873](https://github.com/ptarmiganlabs/butler/issues/873)
* **deps:** Update dependencies ([f2592b0](https://github.com/ptarmiganlabs/butler/commit/f2592b07aa0ef8a65225197e4c0db1a3ff776728))
* **deps:** Update deps to stay safe and secure ([1e9f2f6](https://github.com/ptarmiganlabs/butler/commit/1e9f2f6ccc58d1fb6107fc9960e05c670e0812b3))
* **master:** release 9.3.0 ([d364558](https://github.com/ptarmiganlabs/butler/commit/d36455853e45971ea1a91a701c7ab1b0c29241b0))

## [9.3.0](https://github.com/ptarmiganlabs/butler/compare/v9.2.3...v9.3.0) (2023-12-06)


### Features

* **influxdb:** Store failed reload info in InfluxDB ([b45dedd](https://github.com/ptarmiganlabs/butler/commit/b45deddf3f3ec0a2b5337343fe8cc873ccad3acf)), closes [#866](https://github.com/ptarmiganlabs/butler/issues/866)
* **mqtt:** Add support for Azure Event Grid as MQTT broker ([3794da3](https://github.com/ptarmiganlabs/butler/commit/3794da32a8f80e45217e1bde72b39a327995a390))
* Store reload task success info in InfluxBD ([e642ad4](https://github.com/ptarmiganlabs/butler/commit/e642ad4791605eaa64a4b2368928befbe40d23f4)), closes [#870](https://github.com/ptarmiganlabs/butler/issues/870)


### Bug Fixes

* Disable SMTP mail appender in sample config ([4f63cb3](https://github.com/ptarmiganlabs/butler/commit/4f63cb34cab19aa1b077de867c19c7c3e0ccc890))
* More robust generation of anonymous Butler instance id ([5203d54](https://github.com/ptarmiganlabs/butler/commit/5203d549059f1726deeeb74c89c98eeb715e569b)), closes [#863](https://github.com/ptarmiganlabs/butler/issues/863)
* **mqtt:** Better error handling when establishing MQTT connection ([6299a2c](https://github.com/ptarmiganlabs/butler/commit/6299a2ccb5e64703c15cc56cafb59d5290692f8f))
* Verify that all required config file entries exist ([38c42b0](https://github.com/ptarmiganlabs/butler/commit/38c42b0175d7668574fff69fe1ec424350d95e34)), closes [#874](https://github.com/ptarmiganlabs/butler/issues/874)
* **winservice:** Better handling of services that don't exist ([56a18de](https://github.com/ptarmiganlabs/butler/commit/56a18de4627b0e45cf25677bee0a5e09b1559a8c))


### Miscellaneous

* Add sample config files to release ZIPs ([03f2fdf](https://github.com/ptarmiganlabs/butler/commit/03f2fdf25b8155bd5dec36f5ea9d4cfef9a921f4)), closes [#873](https://github.com/ptarmiganlabs/butler/issues/873)
* **deps:** Update dependencies ([f2592b0](https://github.com/ptarmiganlabs/butler/commit/f2592b07aa0ef8a65225197e4c0db1a3ff776728))
* **deps:** Update deps to stay safe and secure ([1e9f2f6](https://github.com/ptarmiganlabs/butler/commit/1e9f2f6ccc58d1fb6107fc9960e05c670e0812b3))

## [9.2.3](https://github.com/ptarmiganlabs/butler/compare/v9.2.3...v9.2.3) (2023-11-25)


### Miscellaneous

* Bump setup-node to v4 ([fc8a27c](https://github.com/ptarmiganlabs/butler/commit/fc8a27c0ac1fcbc7238ca05cb8d5be6636cd9298))
* **deps:** Update dependencies ([b04d387](https://github.com/ptarmiganlabs/butler/commit/b04d387eeb93a2adc9e7427802c419ef3447ac76))
* **master:** release 9.2.3 ([6cca713](https://github.com/ptarmiganlabs/butler/commit/6cca7132cf4977bcc40959fe2c87f0e272154215))
* Switch to using Node v20 ([0890f79](https://github.com/ptarmiganlabs/butler/commit/0890f79e7742714deae8b7b42344ed9628322c6c))


### Documentation

* Better default config file values for InfluxDB ([9a547d2](https://github.com/ptarmiganlabs/butler/commit/9a547d2670e27bbd64764dbe34c1c93da27eb921))

## [9.2.3](https://github.com/ptarmiganlabs/butler/compare/v9.2.2...v9.2.3) (2023-11-25)


### Miscellaneous

* Bump setup-node to v4 ([fc8a27c](https://github.com/ptarmiganlabs/butler/commit/fc8a27c0ac1fcbc7238ca05cb8d5be6636cd9298))
* **deps:** Update dependencies ([b04d387](https://github.com/ptarmiganlabs/butler/commit/b04d387eeb93a2adc9e7427802c419ef3447ac76))
* Switch to using Node v20 ([0890f79](https://github.com/ptarmiganlabs/butler/commit/0890f79e7742714deae8b7b42344ed9628322c6c))


### Documentation

* Better default config file values for InfluxDB ([9a547d2](https://github.com/ptarmiganlabs/butler/commit/9a547d2670e27bbd64764dbe34c1c93da27eb921))

## [9.2.2](https://github.com/ptarmiganlabs/butler/compare/v9.2.1...v9.2.2) (2023-11-09)


### Bug Fixes

* **disk-util:** All subdirs under approved dirs are also approved ([0ecc402](https://github.com/ptarmiganlabs/butler/commit/0ecc402c8ef56a85a88b08883f0e2330bda79949)), closes [#831](https://github.com/ptarmiganlabs/butler/issues/831)


### Miscellaneous

* **deps:** Update dependencies to stay safe and secure ([e7859b9](https://github.com/ptarmiganlabs/butler/commit/e7859b962f768e60b9dcb7e8d6e40da236b5e42a))
* Improved test cases for file operations ([e48329c](https://github.com/ptarmiganlabs/butler/commit/e48329ce9ec90b1b37c2d9dc1632e4d0e5c02612)), closes [#831](https://github.com/ptarmiganlabs/butler/issues/831)

## [9.2.1](https://github.com/ptarmiganlabs/butler/compare/v9.2.0...v9.2.1) (2023-09-21)


### Bug Fixes

* Add verbose logging showing which NR accounts are used ([907b9ae](https://github.com/ptarmiganlabs/butler/commit/907b9aeb3c135a03c34ba592d45192a2c3c98b2b))
* Typos in Slack/Teams notifrication log messages ([e28b715](https://github.com/ptarmiganlabs/butler/commit/e28b7157a9378ee82af61772a165b80abf4d902b)), closes [#794](https://github.com/ptarmiganlabs/butler/issues/794)


### Miscellaneous

* **deps:** Removed npm as dependency ([84961ef](https://github.com/ptarmiganlabs/butler/commit/84961efdbdb26f14e3f363cb0c2bf992b3c8a988))
* **deps:** update actions/checkout action to v4 ([412ff92](https://github.com/ptarmiganlabs/butler/commit/412ff92f2f0bfb5df76359c8f6bab2fb2de37fb0))
* **deps:** update crazy-max/ghaction-virustotal action to v4 ([cd705e8](https://github.com/ptarmiganlabs/butler/commit/cd705e82139f10133769d981837c5b03de216c3b))
* **deps:** Update dependencies to stay safe and secure ([bbc242c](https://github.com/ptarmiganlabs/butler/commit/bbc242c4060e878fcb4c2b1eda84db28195fc858))
* **deps:** update docker/build-push-action action to v5 ([f48f378](https://github.com/ptarmiganlabs/butler/commit/f48f378a96fd5b9082fa1b6b879f7afe05744e56))
* **deps:** update docker/login-action action to v3 ([725c0e2](https://github.com/ptarmiganlabs/butler/commit/725c0e2958c36e9145d35a45a5c92d2601d8bc05))
* **deps:** update docker/metadata-action action to v5 ([c66bd35](https://github.com/ptarmiganlabs/butler/commit/c66bd35e3df6a3bd304e7aa02a92807013c8789e))
* **deps:** update docker/setup-buildx-action action to v3 ([7fac129](https://github.com/ptarmiganlabs/butler/commit/7fac129b695f8f7b089b9e99c85df49f3873ccbe))
* **deps:** update docker/setup-qemu-action action to v3 ([1a87ceb](https://github.com/ptarmiganlabs/butler/commit/1a87cebe15fd50d030826f6bec5b117ae03e439c))

## [9.2.0](https://github.com/ptarmiganlabs/butler/compare/v9.1.2...v9.2.0) (2023-08-22)


### Features

* **reload-alerts:** Make app owner info available in reload failed alerts ([1912d3e](https://github.com/ptarmiganlabs/butler/commit/1912d3e0c515ede34bebfc1d0ec048a17054ee79)), closes [#728](https://github.com/ptarmiganlabs/butler/issues/728)

## [9.1.2](https://github.com/ptarmiganlabs/butler/compare/v9.1.1...v9.1.2) (2023-08-22)


### Bug Fixes

* **alerts:** Empty alert recipient lists no longer cause errors ([34421ce](https://github.com/ptarmiganlabs/butler/commit/34421cec7d60c1a1569c5a896ac634f3189370c7)), closes [#640](https://github.com/ptarmiganlabs/butler/issues/640)
* **docker:** Fix broken Docker image ([85f016e](https://github.com/ptarmiganlabs/butler/commit/85f016ec6ed8fbfa4163d5d6b4dfbe8417bab2a6)), closes [#764](https://github.com/ptarmiganlabs/butler/issues/764)
* Enable Teams notif for Win service monitor now works ([a0761cb](https://github.com/ptarmiganlabs/butler/commit/a0761cb155ff96192e586f07dfec590fa81e41bd)), closes [#758](https://github.com/ptarmiganlabs/butler/issues/758)


### Miscellaneous

* **deps:** Update dependencies to stay safe and secure ([2165579](https://github.com/ptarmiganlabs/butler/commit/2165579f1fe172589ab339b9859aa0e98a608b13))


### Refactoring

* Add linting command to package.json ([b8332f8](https://github.com/ptarmiganlabs/butler/commit/b8332f8fc5109f7c45a03a0bedc2694acda0f3f1)), closes [#760](https://github.com/ptarmiganlabs/butler/issues/760)
* Fix code linting issues ([b6312ac](https://github.com/ptarmiganlabs/butler/commit/b6312ac94092a10ec5ef8d722b342424e6cb6c32)), closes [#762](https://github.com/ptarmiganlabs/butler/issues/762)
* Fix simpler code structure/linting issues ([c24c446](https://github.com/ptarmiganlabs/butler/commit/c24c446f2e9e71bf782339c3cf5b796e02944b00)), closes [#761](https://github.com/ptarmiganlabs/butler/issues/761)


### Documentation

* **reload-alert:** PDF explaining concept of reload alerts ([dd1efdd](https://github.com/ptarmiganlabs/butler/commit/dd1efdd9429be96b4992777a3f3677dd9eec6d03))

## [9.1.1](https://github.com/ptarmiganlabs/butler/compare/v9.1.0...v9.1.1) (2023-08-17)


### Bug Fixes

* **docker:** Docker image build fixed ([d230e14](https://github.com/ptarmiganlabs/butler/commit/d230e14085f297194ed8c3053293654d3c2931bd))
* **new-relic:** Send task failed event to New Relic ([154a921](https://github.com/ptarmiganlabs/butler/commit/154a921f8e8d406744a7f9aa46416dec6bd20b68)), closes [#750](https://github.com/ptarmiganlabs/butler/issues/750)


### Miscellaneous

* Revert back to auto version numbering ([886b4f6](https://github.com/ptarmiganlabs/butler/commit/886b4f694c5151ce7f5eba4577847499594c436a))

## [9.1.0](https://github.com/ptarmiganlabs/butler/compare/v9.1.0...v9.1.0) (2023-08-17)


### Features

* Only get script log once from Sense server ([f193538](https://github.com/ptarmiganlabs/butler/commit/f19353809e44f17fcce5be3eca1ff5cc0c2925c6)), closes [#741](https://github.com/ptarmiganlabs/butler/issues/741)
* **telemetry:** Change to using PostHog for telemetry collection ([4da339a](https://github.com/ptarmiganlabs/butler/commit/4da339ae3f7d9ce7d3e9fc24ddd442fc19157c7d)), closes [#744](https://github.com/ptarmiganlabs/butler/issues/744)


### Bug Fixes

* Automatic dependencies scanning ([1d8201d](https://github.com/ptarmiganlabs/butler/commit/1d8201dcd0bf469e3690687f27260de61cbc739a))
* **deps:** update dependency @fastify/swagger to v8.9.0 ([b0f5440](https://github.com/ptarmiganlabs/butler/commit/b0f54400a3505b188fe6e5a5a4b6ac45b843f09f))


### Miscellaneous

* **deps:** mkdirp v3 update ([7a0f00d](https://github.com/ptarmiganlabs/butler/commit/7a0f00df4880f136b9d80e7714ef1ebf11dac0ab))
* **deps:** Update @fastify/swagger ([07ed66a](https://github.com/ptarmiganlabs/butler/commit/07ed66a1c4d70cec785a3e91ee8c450f395ce62c))
* **deps:** Update dependencies ([c393a9d](https://github.com/ptarmiganlabs/butler/commit/c393a9dfcdf44398fb9a287d5db394ce3245a5df))
* **deps:** Upgrade ms-teams-webhook dependency ([6e7814a](https://github.com/ptarmiganlabs/butler/commit/6e7814a602e06c7244c256a76d0a15db5738fc58)), closes [#725](https://github.com/ptarmiganlabs/butler/issues/725)
* **deps:** Upgrade to Axios 1.4 ([ef7034b](https://github.com/ptarmiganlabs/butler/commit/ef7034b96181dc2f433c21f552203d756c6da008))
* Incorrect JS file name ([de88f61](https://github.com/ptarmiganlabs/butler/commit/de88f61020e59a46feb082d72c3ce60b612a7f20))
* Install esbuild pre binary build ([1516778](https://github.com/ptarmiganlabs/butler/commit/1516778ff7e058f501018cc2eeea3be9b29b13ff))
* **master:** release 9.1.0 ([9f6f9da](https://github.com/ptarmiganlabs/butler/commit/9f6f9dadc499aa15708d1d6dce2131f591a5bcd8))


### Refactoring

* Reorganize source code ([e4febe6](https://github.com/ptarmiganlabs/butler/commit/e4febe684b61fd281020d7759e7d7624514d51f2))
* **tests:** Update test cases ([c9710b2](https://github.com/ptarmiganlabs/butler/commit/c9710b2820fff3582734c6392cb030ee6b29865f))


### Documentation

* Fix badges ([d1e1405](https://github.com/ptarmiganlabs/butler/commit/d1e140584a32279f6415d2811c201124f8353e13))

## [9.1.0](https://github.com/ptarmiganlabs/butler/compare/v9.0.0...v9.1.0) (2023-08-17)


### Features

* Only get script log once from Sense server ([f193538](https://github.com/ptarmiganlabs/butler/commit/f19353809e44f17fcce5be3eca1ff5cc0c2925c6)), closes [#741](https://github.com/ptarmiganlabs/butler/issues/741)
* **telemetry:** Change to using PostHog for telemetry collection ([4da339a](https://github.com/ptarmiganlabs/butler/commit/4da339ae3f7d9ce7d3e9fc24ddd442fc19157c7d)), closes [#744](https://github.com/ptarmiganlabs/butler/issues/744)


### Bug Fixes

* Automatic dependencies scanning ([1d8201d](https://github.com/ptarmiganlabs/butler/commit/1d8201dcd0bf469e3690687f27260de61cbc739a))
* **deps:** update dependency @fastify/swagger to v8.9.0 ([b0f5440](https://github.com/ptarmiganlabs/butler/commit/b0f54400a3505b188fe6e5a5a4b6ac45b843f09f))


### Miscellaneous

* **deps:** mkdirp v3 update ([7a0f00d](https://github.com/ptarmiganlabs/butler/commit/7a0f00df4880f136b9d80e7714ef1ebf11dac0ab))
* **deps:** Update @fastify/swagger ([07ed66a](https://github.com/ptarmiganlabs/butler/commit/07ed66a1c4d70cec785a3e91ee8c450f395ce62c))
* **deps:** Update dependencies ([c393a9d](https://github.com/ptarmiganlabs/butler/commit/c393a9dfcdf44398fb9a287d5db394ce3245a5df))
* **deps:** Upgrade ms-teams-webhook dependency ([6e7814a](https://github.com/ptarmiganlabs/butler/commit/6e7814a602e06c7244c256a76d0a15db5738fc58)), closes [#725](https://github.com/ptarmiganlabs/butler/issues/725)
* **deps:** Upgrade to Axios 1.4 ([ef7034b](https://github.com/ptarmiganlabs/butler/commit/ef7034b96181dc2f433c21f552203d756c6da008))
* Incorrect JS file name ([de88f61](https://github.com/ptarmiganlabs/butler/commit/de88f61020e59a46feb082d72c3ce60b612a7f20))
* Install esbuild pre binary build ([1516778](https://github.com/ptarmiganlabs/butler/commit/1516778ff7e058f501018cc2eeea3be9b29b13ff))


### Refactoring

* Reorganize source code ([e4febe6](https://github.com/ptarmiganlabs/butler/commit/e4febe684b61fd281020d7759e7d7624514d51f2))
* **tests:** Update test cases ([c9710b2](https://github.com/ptarmiganlabs/butler/commit/c9710b2820fff3582734c6392cb030ee6b29865f))


### Documentation

* Fix badges ([d1e1405](https://github.com/ptarmiganlabs/butler/commit/d1e140584a32279f6415d2811c201124f8353e13))

## [9.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v9.0.0...butler-v9.0.0) (2023-06-13)


### ⚠ BREAKING CHANGES

* Move InfluxDB settings to their own section in config file

### Features

* Add InfluxDB as destination for Windows service status monitoring ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab))
* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* Move InfluxDB settings to their own section in config file ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab)), closes [#670](https://github.com/ptarmiganlabs/butler/issues/670)
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)
* Verify structure of config file on Butler startup ([69e35ff](https://github.com/ptarmiganlabs/butler/commit/69e35ff960f6296f0f3e9c02f50c05bfc0c17a42)), closes [#675](https://github.com/ptarmiganlabs/butler/issues/675)


### Bug Fixes

* Add missing fields to template config file ([157f715](https://github.com/ptarmiganlabs/butler/commit/157f715b27d8640428506944c52c1bd05d1cdb77))
* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))
* Only initiate InfluxDB connection if it's actually enabled in config file ([ba35605](https://github.com/ptarmiganlabs/butler/commit/ba3560559881cd62daf6f590ba7cde9e3f1a116e)), closes [#678](https://github.com/ptarmiganlabs/butler/issues/678)
* Only set up REST server if it's actually enabled in the config file ([7746cee](https://github.com/ptarmiganlabs/butler/commit/7746ceea5281342745864e241a58688385d04b55)), closes [#679](https://github.com/ptarmiganlabs/butler/issues/679)


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** Update dependencies to stay safe and secure ([8419dbc](https://github.com/ptarmiganlabs/butler/commit/8419dbc78112df6bb17a4a4bcc88ef5a0bdbe766))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([f5ba926](https://github.com/ptarmiganlabs/butler/commit/f5ba92653cb5cfbfa3d9449df56793909ae5b9dd))
* **master:** release butler 8.7.0 ([2889d86](https://github.com/ptarmiganlabs/butler/commit/2889d864b7d1b6813a278d757c0abc36bd3b24a1))
* **master:** release butler 8.7.0 ([d5a9f62](https://github.com/ptarmiganlabs/butler/commit/d5a9f62a878dee7411e6cf7d7d2f67ad49a7b776))
* **master:** release butler 8.7.0 ([ca32bd2](https://github.com/ptarmiganlabs/butler/commit/ca32bd2e4cde41da2824d0278d6abaa7aedd7c3a))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))
* **master:** release butler 9.0.0 ([6463e46](https://github.com/ptarmiganlabs/butler/commit/6463e46d9a300b2748870d176e8fff1d98ec6972))
* **master:** release butler 9.0.0 ([3c9b6da](https://github.com/ptarmiganlabs/butler/commit/3c9b6da5fb5e7c3d6cf7f00035dd29df9dc34951))
* **master:** release butler 9.0.0 ([266b19c](https://github.com/ptarmiganlabs/butler/commit/266b19cca2a44d05fbe1a63f16678dce66a89377))
* **master:** release butler 9.0.0 ([59e8523](https://github.com/ptarmiganlabs/butler/commit/59e8523ed4a2950c16b1817aa32fd8d8b62d6465))
* **master:** release butler 9.0.0 ([9ba4208](https://github.com/ptarmiganlabs/butler/commit/9ba4208e4a4f76802f610bf55fdf4093b1d4a22d))

## [9.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v9.0.0...butler-v9.0.0) (2023-05-29)


### ⚠ BREAKING CHANGES

* Move InfluxDB settings to their own section in config file

### Features

* Add InfluxDB as destination for Windows service status monitoring ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab))
* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* Move InfluxDB settings to their own section in config file ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab)), closes [#670](https://github.com/ptarmiganlabs/butler/issues/670)
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)
* Verify structure of config file on Butler startup ([69e35ff](https://github.com/ptarmiganlabs/butler/commit/69e35ff960f6296f0f3e9c02f50c05bfc0c17a42)), closes [#675](https://github.com/ptarmiganlabs/butler/issues/675)


### Bug Fixes

* Add missing fields to template config file ([157f715](https://github.com/ptarmiganlabs/butler/commit/157f715b27d8640428506944c52c1bd05d1cdb77))
* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))
* Only initiate InfluxDB connection if it's actually enabled in config file ([ba35605](https://github.com/ptarmiganlabs/butler/commit/ba3560559881cd62daf6f590ba7cde9e3f1a116e)), closes [#678](https://github.com/ptarmiganlabs/butler/issues/678)
* Only set up REST server if it's actually enabled in the config file ([7746cee](https://github.com/ptarmiganlabs/butler/commit/7746ceea5281342745864e241a58688385d04b55)), closes [#679](https://github.com/ptarmiganlabs/butler/issues/679)


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([f5ba926](https://github.com/ptarmiganlabs/butler/commit/f5ba92653cb5cfbfa3d9449df56793909ae5b9dd))
* **master:** release butler 8.7.0 ([2889d86](https://github.com/ptarmiganlabs/butler/commit/2889d864b7d1b6813a278d757c0abc36bd3b24a1))
* **master:** release butler 8.7.0 ([d5a9f62](https://github.com/ptarmiganlabs/butler/commit/d5a9f62a878dee7411e6cf7d7d2f67ad49a7b776))
* **master:** release butler 8.7.0 ([ca32bd2](https://github.com/ptarmiganlabs/butler/commit/ca32bd2e4cde41da2824d0278d6abaa7aedd7c3a))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))
* **master:** release butler 9.0.0 ([3c9b6da](https://github.com/ptarmiganlabs/butler/commit/3c9b6da5fb5e7c3d6cf7f00035dd29df9dc34951))
* **master:** release butler 9.0.0 ([266b19c](https://github.com/ptarmiganlabs/butler/commit/266b19cca2a44d05fbe1a63f16678dce66a89377))
* **master:** release butler 9.0.0 ([59e8523](https://github.com/ptarmiganlabs/butler/commit/59e8523ed4a2950c16b1817aa32fd8d8b62d6465))
* **master:** release butler 9.0.0 ([9ba4208](https://github.com/ptarmiganlabs/butler/commit/9ba4208e4a4f76802f610bf55fdf4093b1d4a22d))

## [9.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v9.0.0...butler-v9.0.0) (2023-05-29)


### ⚠ BREAKING CHANGES

* Move InfluxDB settings to their own section in config file

### Features

* Add InfluxDB as destination for Windows service status monitoring ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab))
* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* Move InfluxDB settings to their own section in config file ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab)), closes [#670](https://github.com/ptarmiganlabs/butler/issues/670)
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)
* Verify structure of config file on Butler startup ([69e35ff](https://github.com/ptarmiganlabs/butler/commit/69e35ff960f6296f0f3e9c02f50c05bfc0c17a42)), closes [#675](https://github.com/ptarmiganlabs/butler/issues/675)


### Bug Fixes

* Add missing fields to template config file ([157f715](https://github.com/ptarmiganlabs/butler/commit/157f715b27d8640428506944c52c1bd05d1cdb77))
* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))
* Only initiate InfluxDB connection if it's actually enabled in config file ([ba35605](https://github.com/ptarmiganlabs/butler/commit/ba3560559881cd62daf6f590ba7cde9e3f1a116e)), closes [#678](https://github.com/ptarmiganlabs/butler/issues/678)
* Only set up REST server if it's actually enabled in the config file ([7746cee](https://github.com/ptarmiganlabs/butler/commit/7746ceea5281342745864e241a58688385d04b55)), closes [#679](https://github.com/ptarmiganlabs/butler/issues/679)


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([f5ba926](https://github.com/ptarmiganlabs/butler/commit/f5ba92653cb5cfbfa3d9449df56793909ae5b9dd))
* **master:** release butler 8.7.0 ([2889d86](https://github.com/ptarmiganlabs/butler/commit/2889d864b7d1b6813a278d757c0abc36bd3b24a1))
* **master:** release butler 8.7.0 ([d5a9f62](https://github.com/ptarmiganlabs/butler/commit/d5a9f62a878dee7411e6cf7d7d2f67ad49a7b776))
* **master:** release butler 8.7.0 ([ca32bd2](https://github.com/ptarmiganlabs/butler/commit/ca32bd2e4cde41da2824d0278d6abaa7aedd7c3a))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))
* **master:** release butler 9.0.0 ([266b19c](https://github.com/ptarmiganlabs/butler/commit/266b19cca2a44d05fbe1a63f16678dce66a89377))
* **master:** release butler 9.0.0 ([59e8523](https://github.com/ptarmiganlabs/butler/commit/59e8523ed4a2950c16b1817aa32fd8d8b62d6465))
* **master:** release butler 9.0.0 ([9ba4208](https://github.com/ptarmiganlabs/butler/commit/9ba4208e4a4f76802f610bf55fdf4093b1d4a22d))

## [9.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v9.0.0...butler-v9.0.0) (2023-05-29)


### ⚠ BREAKING CHANGES

* Move InfluxDB settings to their own section in config file

### Features

* Add InfluxDB as destination for Windows service status monitoring ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab))
* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* Move InfluxDB settings to their own section in config file ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab)), closes [#670](https://github.com/ptarmiganlabs/butler/issues/670)
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)
* Verify structure of config file on Butler startup ([69e35ff](https://github.com/ptarmiganlabs/butler/commit/69e35ff960f6296f0f3e9c02f50c05bfc0c17a42)), closes [#675](https://github.com/ptarmiganlabs/butler/issues/675)


### Bug Fixes

* Add missing fields to template config file ([157f715](https://github.com/ptarmiganlabs/butler/commit/157f715b27d8640428506944c52c1bd05d1cdb77))
* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))
* Only initiate InfluxDB connection if it's actually enabled in config file ([ba35605](https://github.com/ptarmiganlabs/butler/commit/ba3560559881cd62daf6f590ba7cde9e3f1a116e)), closes [#678](https://github.com/ptarmiganlabs/butler/issues/678)
* Only set up REST server if it's actually enabled in the config file ([7746cee](https://github.com/ptarmiganlabs/butler/commit/7746ceea5281342745864e241a58688385d04b55)), closes [#679](https://github.com/ptarmiganlabs/butler/issues/679)


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([f5ba926](https://github.com/ptarmiganlabs/butler/commit/f5ba92653cb5cfbfa3d9449df56793909ae5b9dd))
* **master:** release butler 8.7.0 ([2889d86](https://github.com/ptarmiganlabs/butler/commit/2889d864b7d1b6813a278d757c0abc36bd3b24a1))
* **master:** release butler 8.7.0 ([d5a9f62](https://github.com/ptarmiganlabs/butler/commit/d5a9f62a878dee7411e6cf7d7d2f67ad49a7b776))
* **master:** release butler 8.7.0 ([ca32bd2](https://github.com/ptarmiganlabs/butler/commit/ca32bd2e4cde41da2824d0278d6abaa7aedd7c3a))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))
* **master:** release butler 9.0.0 ([59e8523](https://github.com/ptarmiganlabs/butler/commit/59e8523ed4a2950c16b1817aa32fd8d8b62d6465))
* **master:** release butler 9.0.0 ([9ba4208](https://github.com/ptarmiganlabs/butler/commit/9ba4208e4a4f76802f610bf55fdf4093b1d4a22d))

## [9.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v9.0.0...butler-v9.0.0) (2023-05-29)


### ⚠ BREAKING CHANGES

* Move InfluxDB settings to their own section in config file

### Features

* Add InfluxDB as destination for Windows service status monitoring ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab))
* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* Move InfluxDB settings to their own section in config file ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab)), closes [#670](https://github.com/ptarmiganlabs/butler/issues/670)
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)
* Verify structure of config file on Butler startup ([69e35ff](https://github.com/ptarmiganlabs/butler/commit/69e35ff960f6296f0f3e9c02f50c05bfc0c17a42)), closes [#675](https://github.com/ptarmiganlabs/butler/issues/675)


### Bug Fixes

* Add missing fields to template config file ([157f715](https://github.com/ptarmiganlabs/butler/commit/157f715b27d8640428506944c52c1bd05d1cdb77))
* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))
* Only initiate InfluxDB connection if it's actually enabled in config file ([ba35605](https://github.com/ptarmiganlabs/butler/commit/ba3560559881cd62daf6f590ba7cde9e3f1a116e)), closes [#678](https://github.com/ptarmiganlabs/butler/issues/678)
* Only set up REST server if it's actually enabled in the config file ([7746cee](https://github.com/ptarmiganlabs/butler/commit/7746ceea5281342745864e241a58688385d04b55)), closes [#679](https://github.com/ptarmiganlabs/butler/issues/679)


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([f5ba926](https://github.com/ptarmiganlabs/butler/commit/f5ba92653cb5cfbfa3d9449df56793909ae5b9dd))
* **master:** release butler 8.7.0 ([2889d86](https://github.com/ptarmiganlabs/butler/commit/2889d864b7d1b6813a278d757c0abc36bd3b24a1))
* **master:** release butler 8.7.0 ([d5a9f62](https://github.com/ptarmiganlabs/butler/commit/d5a9f62a878dee7411e6cf7d7d2f67ad49a7b776))
* **master:** release butler 8.7.0 ([ca32bd2](https://github.com/ptarmiganlabs/butler/commit/ca32bd2e4cde41da2824d0278d6abaa7aedd7c3a))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))
* **master:** release butler 9.0.0 ([9ba4208](https://github.com/ptarmiganlabs/butler/commit/9ba4208e4a4f76802f610bf55fdf4093b1d4a22d))

## [9.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.7.0...butler-v9.0.0) (2023-05-28)


### ⚠ BREAKING CHANGES

* Move InfluxDB settings to their own section in config file

### Features

* Add InfluxDB as destination for Windows service status monitoring ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab))
* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* Move InfluxDB settings to their own section in config file ([d2e4d25](https://github.com/ptarmiganlabs/butler/commit/d2e4d256bf7ca1148495832ede95fae06068b0ab)), closes [#670](https://github.com/ptarmiganlabs/butler/issues/670)
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)


### Bug Fixes

* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([f5ba926](https://github.com/ptarmiganlabs/butler/commit/f5ba92653cb5cfbfa3d9449df56793909ae5b9dd))
* **master:** release butler 8.7.0 ([2889d86](https://github.com/ptarmiganlabs/butler/commit/2889d864b7d1b6813a278d757c0abc36bd3b24a1))
* **master:** release butler 8.7.0 ([d5a9f62](https://github.com/ptarmiganlabs/butler/commit/d5a9f62a878dee7411e6cf7d7d2f67ad49a7b776))
* **master:** release butler 8.7.0 ([ca32bd2](https://github.com/ptarmiganlabs/butler/commit/ca32bd2e4cde41da2824d0278d6abaa7aedd7c3a))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))

## [8.7.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.7.0...butler-v8.7.0) (2023-05-27)


### Features

* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)


### Bug Fixes

* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([2889d86](https://github.com/ptarmiganlabs/butler/commit/2889d864b7d1b6813a278d757c0abc36bd3b24a1))
* **master:** release butler 8.7.0 ([d5a9f62](https://github.com/ptarmiganlabs/butler/commit/d5a9f62a878dee7411e6cf7d7d2f67ad49a7b776))
* **master:** release butler 8.7.0 ([ca32bd2](https://github.com/ptarmiganlabs/butler/commit/ca32bd2e4cde41da2824d0278d6abaa7aedd7c3a))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))

## [8.7.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.7.0...butler-v8.7.0) (2023-05-27)


### Features

* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)


### Bug Fixes

* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([d5a9f62](https://github.com/ptarmiganlabs/butler/commit/d5a9f62a878dee7411e6cf7d7d2f67ad49a7b776))
* **master:** release butler 8.7.0 ([ca32bd2](https://github.com/ptarmiganlabs/butler/commit/ca32bd2e4cde41da2824d0278d6abaa7aedd7c3a))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))

## [8.7.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.7.0...butler-v8.7.0) (2023-05-27)


### Features

* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)


### Bug Fixes

* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([ca32bd2](https://github.com/ptarmiganlabs/butler/commit/ca32bd2e4cde41da2824d0278d6abaa7aedd7c3a))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))

## [8.7.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.7.0...butler-v8.7.0) (2023-05-27)


### Features

* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* log at startup current API rate limit ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* log at startup which config file is used ([2fd7055](https://github.com/ptarmiganlabs/butler/commit/2fd70550cde69e1ee69d43529b04f8423ddbdb1d))
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)


### Bug Fixes

* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([3bfae07](https://github.com/ptarmiganlabs/butler/commit/3bfae073f3274e7f3de457c37b871593109c2f91))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))

## [8.7.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.7.0...butler-v8.7.0) (2023-05-27)


### Features

* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)


### Bug Fixes

* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([e0bfaee](https://github.com/ptarmiganlabs/butler/commit/e0bfaee0b6281f249732e1dc5ac994f3ad75d599))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))

## [8.7.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.7.0...butler-v8.7.0) (2023-05-27)


### Features

* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)
* Log warnings when API rate limits exceeded ([c15c45d](https://github.com/ptarmiganlabs/butler/commit/c15c45d662b9ab73a3fd0ab1023b5d630aff88f8))
* New command line option for setting API rate limit ([2b08c5e](https://github.com/ptarmiganlabs/butler/commit/2b08c5ed207004a2425951f61fe41541fb88736c)), closes [#659](https://github.com/ptarmiganlabs/butler/issues/659)


### Bug Fixes

* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))
* **master:** release butler 8.7.0 ([b09155e](https://github.com/ptarmiganlabs/butler/commit/b09155e9fba1623a7c3b74ea784a974098132597))

## [8.7.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.6.2...butler-v8.7.0) (2023-05-27)


### Features

* Add monitoring of Windows services ([da6dfcc](https://github.com/ptarmiganlabs/butler/commit/da6dfcc8ff0e883cde3026db5c24db4b4549d47e)), closes [#637](https://github.com/ptarmiganlabs/butler/issues/637)


### Bug Fixes

* **deps:** update dependency yargs to v17.7.2 ([79dd198](https://github.com/ptarmiganlabs/butler/commit/79dd1988ada10b64ac6466b3fbd8ce7736b36a3d))


### Miscellaneous

* **deps:** Update dependecies to stay safe and secure ([f7656af](https://github.com/ptarmiganlabs/butler/commit/f7656af18821444b91444040de3312b293ddd951))
* **deps:** Update dependencies ([c293727](https://github.com/ptarmiganlabs/butler/commit/c2937276a36e87b5b4ad4cf367729953d743fc58))
* **deps:** update dependency prettier to v2.8.7 ([883fb4c](https://github.com/ptarmiganlabs/butler/commit/883fb4c0dc90be8e3cccea64553b8e04c196c582))
* **deps:** update node.js to v20 ([526439e](https://github.com/ptarmiganlabs/butler/commit/526439e53c806b89a714dfc67c21495db3834f14))
* Fix temp error in release process ([0f15633](https://github.com/ptarmiganlabs/butler/commit/0f156330a17da48cdbc4215e39e823fe410359c4))

## [8.6.2](https://github.com/ptarmiganlabs/butler/compare/butler-v8.6.1...butler-v8.6.2) (2023-01-11)


### Miscellaneous

* **deps:** Update dependencies to stay safe and secure ([f677787](https://github.com/ptarmiganlabs/butler/commit/f677787d7c1028c87592f409f779f057882e3e7c))

## [8.6.1](https://github.com/ptarmiganlabs/butler/compare/butler-v8.6.0...butler-v8.6.1) (2022-12-09)


### Bug Fixes

* Allow empty New Relic settings in config file's uptime section ([1de18e7](https://github.com/ptarmiganlabs/butler/commit/1de18e7bec819f3d124f77a1051269d067486d86)), closes [#562](https://github.com/ptarmiganlabs/butler/issues/562)
* Allow uptime reporting to New Relic without custom http headers ([f455a38](https://github.com/ptarmiganlabs/butler/commit/f455a38d23b93fc6cd70b716d8a8eb3227cdf4cb)), closes [#587](https://github.com/ptarmiganlabs/butler/issues/587)
* Better log messages when rate limiting for reload notifications passes ([0ee04fb](https://github.com/ptarmiganlabs/butler/commit/0ee04fb40b1a52b415203c42e9eee2a95068cef1)), closes [#571](https://github.com/ptarmiganlabs/butler/issues/571)
* Config asset errors when starting Butler without any New Relic accounts specified ([178b908](https://github.com/ptarmiganlabs/butler/commit/178b9088bdac035073ab299856e9cb7b852a0d35)), closes [#598](https://github.com/ptarmiganlabs/butler/issues/598)
* Improve warning when custom property names in config file don't exist in Sense ([a53cbe8](https://github.com/ptarmiganlabs/butler/commit/a53cbe8d581b14571d61508112dc0e0915cb17e7)), closes [#586](https://github.com/ptarmiganlabs/butler/issues/586)
* Only send to New Relic if event/log is enabled AND custom property name specified. ([9fc81d0](https://github.com/ptarmiganlabs/butler/commit/9fc81d05c90a862cd477d90d25109b57e968bebc)), closes [#596](https://github.com/ptarmiganlabs/butler/issues/596)
* Upgrade Swagger docs to latest version ([2cf84b9](https://github.com/ptarmiganlabs/butler/commit/2cf84b93336f612aba5421442b431e9e1e5e2991)), closes [#599](https://github.com/ptarmiganlabs/butler/issues/599)


### Miscellaneous

* **deps:** Update dependencies ([5bc3dd4](https://github.com/ptarmiganlabs/butler/commit/5bc3dd43a87ce4597d1f59a7c20479c24774d7f4))
* **deps:** Update fs-extra major release ([57bcb9a](https://github.com/ptarmiganlabs/butler/commit/57bcb9abb427e346f7cc6ccaadd555420e9a2d6a))
* **deps:** Upgrade Axios to 1.2.0 (major upgrade) ([1a4111b](https://github.com/ptarmiganlabs/butler/commit/1a4111ba18b4ed86029df08052115dd324dff03e))
* Revert back to Axios 0.27.2 as later versions are incompatible with tool used to create binaries. ([9d222df](https://github.com/ptarmiganlabs/butler/commit/9d222dffd58279b2cc75b12623ed3cdfecca188b))

## [8.6.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.5.3...butler-v8.6.0) (2022-10-27)


### Miscellaneous

* **deps:** Update dependencies to stay safe & secure ([c7a8c74](https://github.com/ptarmiganlabs/butler/commit/c7a8c74150f4c4769402798191ca71e61b41857e))

## [8.5.3](https://github.com/ptarmiganlabs/butler/compare/butler-v8.5.2...butler-v8.5.3) (2022-10-12)


### Miscellaneous

* **deps:** Update dependencies ([c0046a3](https://github.com/ptarmiganlabs/butler/commit/c0046a320fde93e177a1db765cfa2b98edaceeb2))

## [8.5.2](https://github.com/ptarmiganlabs/butler/compare/butler-v8.5.1...butler-v8.5.2) (2022-10-05)


### Bug Fixes

* Handle startup error messages without... errors ([1c3429c](https://github.com/ptarmiganlabs/butler/commit/1c3429c3759d4820bb57c399dece428e02e494bf)), closes [#567](https://github.com/ptarmiganlabs/butler/issues/567)
* Improved startup checks of custom properties handling New Relic destinations ([9a1177b](https://github.com/ptarmiganlabs/butler/commit/9a1177b99b816166fb8eded6fa0e8b2e2503c17a)), closes [#565](https://github.com/ptarmiganlabs/butler/issues/565)
* Incorrect error messages in config assert module ([f4e2ef8](https://github.com/ptarmiganlabs/butler/commit/f4e2ef8ced0dc3765c9c9eb35c4e6320d4366019)), closes [#566](https://github.com/ptarmiganlabs/butler/issues/566)


### Miscellaneous

* **deps:** Update dependencies ([0224327](https://github.com/ptarmiganlabs/butler/commit/022432756d219178335987bf60812263fa03bb32))

## [8.5.1](https://github.com/ptarmiganlabs/butler/compare/butler-v8.5.0...butler-v8.5.1) (2022-10-03)


### Bug Fixes

* New Relic CLI options now work again ([b762109](https://github.com/ptarmiganlabs/butler/commit/b762109234b5d3c3e09f5417c58f3e76dc2afb55)), closes [#560](https://github.com/ptarmiganlabs/butler/issues/560)


### Miscellaneous

* **deps:** update dependency jest to v29.1.2 ([4038bbc](https://github.com/ptarmiganlabs/butler/commit/4038bbcefe151234cd9ba9105325eff97b9f3677))
* **deps:** update dependency snyk to v1.1020.0 ([0b2a99d](https://github.com/ptarmiganlabs/butler/commit/0b2a99d7911b63947e9c2e342fb211040c2e6c59))

## [8.5.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.4.2...butler-v8.5.0) (2022-09-29)


### Features

* Add new command line option --no-qs-connection ([eda18a0](https://github.com/ptarmiganlabs/butler/commit/eda18a0b01a2744d537285eee93b452933d826d8)), closes [#555](https://github.com/ptarmiganlabs/butler/issues/555)
* **new-relic:** Allow per-reload-task control of to which New Relic account failed/aborted reload alerts are sent ([aa81ceb](https://github.com/ptarmiganlabs/butler/commit/aa81cebef19aadd505072a7d2990efe47b5606c2)), closes [#475](https://github.com/ptarmiganlabs/butler/issues/475)


### Bug Fixes

* **deps:** Dependencies minor updates ([4ca858b](https://github.com/ptarmiganlabs/butler/commit/4ca858bae9b968fa0794aed4d1cd0ed6f584064a))
* **deps:** Dependencies patch updates ([445e1fa](https://github.com/ptarmiganlabs/butler/commit/445e1fa453199371d1a7ff2b9d80f5f59462080a))
* **deps:** Update dependency Jest 28.1.3 > 29.0.3 ([c9adf26](https://github.com/ptarmiganlabs/butler/commit/c9adf264cda806ae9f0800ad5a16c1ec89dce1f1))
* **deps:** Update dependency uuid 8.3.2 > 9.0.0 ([98349dd](https://github.com/ptarmiganlabs/butler/commit/98349ddca2147a617143767727adf0859ab03cff))
* **deps:** Update eslint 7.32.0 > 8.24.0 ([e69ecd2](https://github.com/ptarmiganlabs/butler/commit/e69ecd2171e38a2ec77ad31079e998a47a42a78d))
* **deps:** Update sub-level deps to latest versions ([0a8cc73](https://github.com/ptarmiganlabs/butler/commit/0a8cc739069a83e74d41acef32d08b79ef918dbb))
* Increase timeout when getting script logs ([eb1de8c](https://github.com/ptarmiganlabs/butler/commit/eb1de8c773200c74d29794a61a508793e08f8467)), closes [#473](https://github.com/ptarmiganlabs/butler/issues/473)
* **scriptlog:** More descriptive messages when script log retrieval fails ([923182b](https://github.com/ptarmiganlabs/butler/commit/923182b04ded55507a54baad5d5b0d1c16a31747)), closes [#551](https://github.com/ptarmiganlabs/butler/issues/551)


### Miscellaneous

* **deps:** pin dependencies ([e6e60c2](https://github.com/ptarmiganlabs/butler/commit/e6e60c20a22d453be6e25710aafe44adede55a84))
* **deps:** Update dependencies to latest versions ([2d9fb99](https://github.com/ptarmiganlabs/butler/commit/2d9fb99b9226742b1ca06e8df30a7acf08918f67))

## [8.4.2](https://github.com/ptarmiganlabs/butler/compare/butler-v8.4.1...butler-v8.4.2) (2022-08-09)


### Bug Fixes

* Add Linux binaries to build pipeline ([95e4db5](https://github.com/ptarmiganlabs/butler/commit/95e4db5e3d272dba4cb9a3146d740b1b43c60ec4)), closes [#540](https://github.com/ptarmiganlabs/butler/issues/540)

## [8.4.1](https://github.com/ptarmiganlabs/butler/compare/butler-v8.4.0...butler-v8.4.1) (2022-08-08)


### Bug Fixes

* Properly store demo apps in Git ([1fa541a](https://github.com/ptarmiganlabs/butler/commit/1fa541ab7db1573eb6b8fe089406e9daf73962a3)), closes [#533](https://github.com/ptarmiganlabs/butler/issues/533)

## [8.4.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.4.0...butler-v8.4.0) (2022-08-08)


### Features

* Make file copy/move/delete REST endpoints more robust ([ca91a2b](https://github.com/ptarmiganlabs/butler/commit/ca91a2b6c7bcf7f6ce778fcbd8c8c8d509701ba7)), closes [#521](https://github.com/ptarmiganlabs/butler/issues/521)
* Warn if UNC paths used with file API calls when Butler runs on non-Windows OS ([843f781](https://github.com/ptarmiganlabs/butler/commit/843f7815767cba549b8fffd4865979fad08622aa)), closes [#522](https://github.com/ptarmiganlabs/butler/issues/522)


### Bug Fixes

* Make startup logging of approved directories for file copy/move/delete less verbose ([e6a94c3](https://github.com/ptarmiganlabs/butler/commit/e6a94c32473a49a60f7f76949b04506477c2f523)), closes [#523](https://github.com/ptarmiganlabs/butler/issues/523)


### Miscellaneous

* **master:** release butler 8.4.0 ([abe6468](https://github.com/ptarmiganlabs/butler/commit/abe64683c4d46e310dfdf45bb445b84559d913eb))
* **master:** release butler 8.4.0 ([755947f](https://github.com/ptarmiganlabs/butler/commit/755947f6d1750ce6e4bfde2fa2f506afe86a581a))
* Update dependencies ([2bc7a61](https://github.com/ptarmiganlabs/butler/commit/2bc7a618fec2b3302e4c475f76a591bb204dc8d8))

## [8.4.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.4.0...butler-v8.4.0) (2022-08-07)


### Features

* Make file copy/move/delete REST endpoints more robust ([ca91a2b](https://github.com/ptarmiganlabs/butler/commit/ca91a2b6c7bcf7f6ce778fcbd8c8c8d509701ba7)), closes [#521](https://github.com/ptarmiganlabs/butler/issues/521)
* Warn if UNC paths used with file API calls when Butler runs on non-Windows OS ([843f781](https://github.com/ptarmiganlabs/butler/commit/843f7815767cba549b8fffd4865979fad08622aa)), closes [#522](https://github.com/ptarmiganlabs/butler/issues/522)


### Bug Fixes

* Make startup logging of approved directories for file copy/move/delete less verbose ([e6a94c3](https://github.com/ptarmiganlabs/butler/commit/e6a94c32473a49a60f7f76949b04506477c2f523)), closes [#523](https://github.com/ptarmiganlabs/butler/issues/523)


### Miscellaneous

* **master:** release butler 8.4.0 ([755947f](https://github.com/ptarmiganlabs/butler/commit/755947f6d1750ce6e4bfde2fa2f506afe86a581a))
* Update dependencies ([2bc7a61](https://github.com/ptarmiganlabs/butler/commit/2bc7a618fec2b3302e4c475f76a591bb204dc8d8))

## [8.4.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.3.3...butler-v8.4.0) (2022-08-07)


### Features

* Make file copy/move/delete REST endpoints more robust ([ca91a2b](https://github.com/ptarmiganlabs/butler/commit/ca91a2b6c7bcf7f6ce778fcbd8c8c8d509701ba7)), closes [#521](https://github.com/ptarmiganlabs/butler/issues/521)
* Warn if UNC paths used with file API calls when Butler runs on non-Windows OS ([843f781](https://github.com/ptarmiganlabs/butler/commit/843f7815767cba549b8fffd4865979fad08622aa)), closes [#522](https://github.com/ptarmiganlabs/butler/issues/522)


### Bug Fixes

* Make startup logging of approved directories for file copy/move/delete less verbose ([e6a94c3](https://github.com/ptarmiganlabs/butler/commit/e6a94c32473a49a60f7f76949b04506477c2f523)), closes [#523](https://github.com/ptarmiganlabs/butler/issues/523)


### Miscellaneous

* Update dependencies ([2bc7a61](https://github.com/ptarmiganlabs/butler/commit/2bc7a618fec2b3302e4c475f76a591bb204dc8d8))

## [8.3.3](https://github.com/ptarmiganlabs/butler/compare/butler-v8.3.2...butler-v8.3.3) (2022-06-22)


### Bug Fixes

* API endpoint /v4/schedules/status now respects enable/disable in config file ([f8d9417](https://github.com/ptarmiganlabs/butler/commit/f8d94170c9b610d34d264f65ad24dbb742232537)), closes [#509](https://github.com/ptarmiganlabs/butler/issues/509)
* Incorrect return value from base conversion API endpoint ([25583c5](https://github.com/ptarmiganlabs/butler/commit/25583c5a8ba12df38e6d96142a5edb96bcf0a0e2)), closes [#508](https://github.com/ptarmiganlabs/butler/issues/508)


### Refactoring

* Migrate to Fastify 4 ([2e4b00e](https://github.com/ptarmiganlabs/butler/commit/2e4b00ea0a5f9e7286b35030eeac47af1ee7fea8)), closes [#510](https://github.com/ptarmiganlabs/butler/issues/510)


### Documentation

* Upgrade internal API docs to use OpenAPI 3.x ([c444943](https://github.com/ptarmiganlabs/butler/commit/c4449431a2c25748ec0900777a2c63fcf1e18092)), closes [#511](https://github.com/ptarmiganlabs/butler/issues/511)

## [8.3.2](https://github.com/ptarmiganlabs/butler/compare/butler-v8.3.1...butler-v8.3.2) (2022-06-20)


### Bug Fixes

* Update template config file wrt sending data to multiple New Relic accounts ([58277dc](https://github.com/ptarmiganlabs/butler/commit/58277dc3a2b3a76fe9b3591fed18eca55003858a)), closes [#505](https://github.com/ptarmiganlabs/butler/issues/505)

## [8.3.1](https://github.com/ptarmiganlabs/butler/compare/butler-v8.3.0...butler-v8.3.1) (2022-06-20)


### Bug Fixes

* Add missing API endpoint docs to HTML/YAML/JSON API documents ([83a3c65](https://github.com/ptarmiganlabs/butler/commit/83a3c65b38126a16a9d0c87076f5a4d68121c91d)), closes [#502](https://github.com/ptarmiganlabs/butler/issues/502)

## [8.3.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.2.0...butler-v8.3.0) (2022-06-20)


### Features

* Send New Relic metrics, events and logs to zero, one or more New Relic accounts ([d3b8968](https://github.com/ptarmiganlabs/butler/commit/d3b8968d6146db441cbdf2ff2ddac99fc8ab2968)), closes [#489](https://github.com/ptarmiganlabs/butler/issues/489)


### Refactoring

* Enforce code style across all files. ([c3f97e5](https://github.com/ptarmiganlabs/butler/commit/c3f97e572b49c6ad0327475ae0e1eb4831d54af3)), closes [#497](https://github.com/ptarmiganlabs/butler/issues/497)


### Miscellaneous

* Update dependencies ([ac3ffc0](https://github.com/ptarmiganlabs/butler/commit/ac3ffc0f0fda4d9e42b61bff4faea06869f09009))
* Update dependencies ([d8ff101](https://github.com/ptarmiganlabs/butler/commit/d8ff10171b3472c5e657e052f42eb1dfc0853af3))

## [8.2.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.1.0...butler-v8.2.0) (2022-06-12)


### Features

* Add failed/aborted reload task and app tags as metadata for New Relic events and logs ([df65ae5](https://github.com/ptarmiganlabs/butler/commit/df65ae5966a910928cf92b3ed4811185c7e9d956)), closes [#479](https://github.com/ptarmiganlabs/butler/issues/479)
* Add optional "from" option when sending test email ([aa4e148](https://github.com/ptarmiganlabs/butler/commit/aa4e1482da1af262c6cb56820eee43c2aa7eb260)), closes [#486](https://github.com/ptarmiganlabs/butler/issues/486)


### Bug Fixes

* Add better debug logging around which email addresses are used when sending alert emails ([8e6fb32](https://github.com/ptarmiganlabs/butler/commit/8e6fb32496ceaff3c24a5bc932a50a44a0031bbc)), closes [#487](https://github.com/ptarmiganlabs/butler/issues/487)
* Back slash in script log breaks Slack and Teams messages ([f36aa36](https://github.com/ptarmiganlabs/butler/commit/f36aa36988bdbfef43462caac3f3df2a346143cf)), closes [#485](https://github.com/ptarmiganlabs/butler/issues/485)
* Better debug logging when posting data to New Relic ([dbf0156](https://github.com/ptarmiganlabs/butler/commit/dbf0156e7f208db1e1ac218f0e1f8aab0eb8f571))


### Miscellaneous

* **deps:** Updated dependencies ([0a9c116](https://github.com/ptarmiganlabs/butler/commit/0a9c116c8933fd38602696f3ddb9b3df8f4a37cd))

## [8.1.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.1.0...butler-v8.1.0) (2022-05-20)


### Features

* Send New Relic events via Butler REST API ([0da0d85](https://github.com/ptarmiganlabs/butler/commit/0da0d85cd192587fe6e02b174ab8547a03304b83)), closes [#441](https://github.com/ptarmiganlabs/butler/issues/441)


### Bug Fixes

* Fix broken GitHub Actions ([d88179e](https://github.com/ptarmiganlabs/butler/commit/d88179ec87a1bd647abbcad7a795e4ddcf8d8a4a))
* Incorrect New Relic API url used when posting metrics via Butler's REST API ([43c037a](https://github.com/ptarmiganlabs/butler/commit/43c037adb334e03a422be6925c6053b7f77a0abb)), closes [#468](https://github.com/ptarmiganlabs/butler/issues/468)
* No more errors when empty New Relic metrics attribute/header arrays in config file ([81e65ca](https://github.com/ptarmiganlabs/butler/commit/81e65caf9930314a8f652e51ab5875e6d9903db6)), closes [#467](https://github.com/ptarmiganlabs/butler/issues/467)


### Miscellaneous

* **master:** release butler 8.1.0 ([cb16409](https://github.com/ptarmiganlabs/butler/commit/cb16409da81dab30ce7211d0b7eeab71d7cec204))

## [8.1.0](https://github.com/ptarmiganlabs/butler/compare/butler-v8.0.1...butler-v8.1.0) (2022-05-20)


### Features

* Send New Relic events via Butler REST API ([0da0d85](https://github.com/ptarmiganlabs/butler/commit/0da0d85cd192587fe6e02b174ab8547a03304b83)), closes [#441](https://github.com/ptarmiganlabs/butler/issues/441)


### Bug Fixes

* Incorrect New Relic API url used when posting metrics via Butler's REST API ([43c037a](https://github.com/ptarmiganlabs/butler/commit/43c037adb334e03a422be6925c6053b7f77a0abb)), closes [#468](https://github.com/ptarmiganlabs/butler/issues/468)
* No more errors when empty New Relic metrics attribute/header arrays in config file ([81e65ca](https://github.com/ptarmiganlabs/butler/commit/81e65caf9930314a8f652e51ab5875e6d9903db6)), closes [#467](https://github.com/ptarmiganlabs/butler/issues/467)

### [8.0.1](https://github.com/ptarmiganlabs/butler/compare/butler-v8.0.0...butler-v8.0.1) (2022-05-20)


### Bug Fixes

* Empty attribute arrays in New Relic config no longer cause errors ([6bf5ea5](https://github.com/ptarmiganlabs/butler/commit/6bf5ea55b83cb188224ce219c9486d1dd5349e7b)), closes [#464](https://github.com/ptarmiganlabs/butler/issues/464)

## [8.0.0](https://github.com/ptarmiganlabs/butler/compare/butler-v7.5.1...butler-v8.0.0) (2022-05-20)


### ⚠ BREAKING CHANGES

* Forward script logs for failed and aborted reloads to New Relic

### Features

* Command line option for sending test email ([4899e6c](https://github.com/ptarmiganlabs/butler/commit/4899e6c4436fabaae5633b890d88d1a24d03037a)), closes [#430](https://github.com/ptarmiganlabs/butler/issues/430)
* Forward script logs for failed and aborted reloads to New Relic ([d1237ab](https://github.com/ptarmiganlabs/butler/commit/d1237abddc42c44c07ad7b22f04c98c5be77c91d)), closes [#460](https://github.com/ptarmiganlabs/butler/issues/460)


### Miscellaneous

* **deps:** Updated dependencies ([7e3aed0](https://github.com/ptarmiganlabs/butler/commit/7e3aed058a4d308a981041c267381cb0896e0486))

### [7.5.1](https://github.com/ptarmiganlabs/butler/compare/butler-v7.5.0...butler-v7.5.1) (2022-05-16)


### Bug Fixes

* **config:** Disable API-generate-doc setting in sample config file ([0b4a784](https://github.com/ptarmiganlabs/butler/commit/0b4a78446c6fd52040b1aefd7447524afc98bfb1)), closes [#453](https://github.com/ptarmiganlabs/butler/issues/453)
* **config:** Disable sending alerts to New Relic in sample config file ([38219f6](https://github.com/ptarmiganlabs/butler/commit/38219f686be73cf3e3a9275a9cc235986a63fb0b)), closes [#452](https://github.com/ptarmiganlabs/butler/issues/452)

## [7.5.0](https://github.com/ptarmiganlabs/butler/compare/butler-v7.4.0...butler-v7.5.0) (2022-05-15)


### Features

* Automatic cration of API docs as part of CI pipeline ([7ecf05b](https://github.com/ptarmiganlabs/butler/commit/7ecf05b9e5ec0800656137ad192257fd142c58d1)), closes [#444](https://github.com/ptarmiganlabs/butler/issues/444)

## [7.4.0](https://github.com/ptarmiganlabs/butler/compare/butler-v7.3.2...butler-v7.4.0) (2022-05-14)


### Features

* Add config setting to enable create-API-docs-mode ([d9127f0](https://github.com/ptarmiganlabs/butler/commit/d9127f05657459d6d09f66142f658839398d1103)), closes [#447](https://github.com/ptarmiganlabs/butler/issues/447)
* API endpoint for sending gauge metrics to New Relic ([13063a0](https://github.com/ptarmiganlabs/butler/commit/13063a0cf031c87fac69d6b5e8472c4506e3732c)), closes [#440](https://github.com/ptarmiganlabs/butler/issues/440)
* Base alert email rate limits on taskId + email address combination ([bc07935](https://github.com/ptarmiganlabs/butler/commit/bc0793589d4fc2774f497d68d10d58721341ff7e)), closes [#424](https://github.com/ptarmiganlabs/butler/issues/424)
* Enable/disable alert emails per reload task. ([3a2a9f6](https://github.com/ptarmiganlabs/butler/commit/3a2a9f64bce2d5181e0d59fcbbcec50f2bb08fdb))


### Bug Fixes

* API docs REST endpoint doesn't work for pre-built binaries ([53cf3fa](https://github.com/ptarmiganlabs/butler/commit/53cf3faed13e5d66f1ee81845fda2bea6afe3394)), closes [#443](https://github.com/ptarmiganlabs/butler/issues/443)
* Change name of New Relic event for failed and aborted reload tasks ([d81ab39](https://github.com/ptarmiganlabs/butler/commit/d81ab391027da7b484145d21d782d60b2eb9e386)), closes [#418](https://github.com/ptarmiganlabs/butler/issues/418)
* Change New Relic metric names for Butler uptime metrics ([6ead1f6](https://github.com/ptarmiganlabs/butler/commit/6ead1f69633996c442778c1797b964262574f586)), closes [#419](https://github.com/ptarmiganlabs/butler/issues/419)
* REST API docs not showing ([bef031f](https://github.com/ptarmiganlabs/butler/commit/bef031f2843312447d0ab177e6ee3a767f0a866a)), closes [#442](https://github.com/ptarmiganlabs/butler/issues/442)
* Verify that Slack/Teams message template file exists before opening it. ([0a44792](https://github.com/ptarmiganlabs/butler/commit/0a4479279abd3750e58f983a06d325182eaf07b4)), closes [#427](https://github.com/ptarmiganlabs/butler/issues/427)


### Refactoring

* Change Butler's log prefixes for failed reloads ([5d6e19b](https://github.com/ptarmiganlabs/butler/commit/5d6e19bb8d97c83d5521567332bb903e7cb0412c)), closes [#425](https://github.com/ptarmiganlabs/butler/issues/425)
* Enable better logging of errors to console ([f52d716](https://github.com/ptarmiganlabs/butler/commit/f52d7165cf678092a796d3b3870be3f0b3c67ab2)), closes [#434](https://github.com/ptarmiganlabs/butler/issues/434)
* Make source code file names consistent throughout Butler ([590285a](https://github.com/ptarmiganlabs/butler/commit/590285a9a7e9f2c4f20ea8b968b946ffcf87e48b)), closes [#422](https://github.com/ptarmiganlabs/butler/issues/422)


### Miscellaneous

* **deps:** pin dependency snyk to 1.931.0 ([b04767b](https://github.com/ptarmiganlabs/butler/commit/b04767b3141a0304226c81942d2b45c5efd42aea))
* **deps:** Update dependencies ([7e95736](https://github.com/ptarmiganlabs/butler/commit/7e95736ba0aa91f80ba671d51f39e14cddc97cb6))
* **deps:** update dependency jest to v28.0.3 ([918cad1](https://github.com/ptarmiganlabs/butler/commit/918cad1acce0a9217521f6a12d82d0cc68efb591))
* **deps:** update dependency jest to v28.1.0 ([910eb8a](https://github.com/ptarmiganlabs/butler/commit/910eb8a079723534e356c3a1454e9f0a24300df8))
* **deps:** update dependency snyk to v1.914.0 ([2fc2275](https://github.com/ptarmiganlabs/butler/commit/2fc2275a6e6c177314bdca33404282d99f185460))
* **deps:** update dependency snyk to v1.922.0 ([769fadd](https://github.com/ptarmiganlabs/butler/commit/769fadd46a116247103b2acce7ffeab9dd1bc473))
* **deps:** update Fastify plugins ([f16c0fb](https://github.com/ptarmiganlabs/butler/commit/f16c0fb1b4c955f50ab3fb03c9a5873c2bb6d905))
* **deps:** Updated dependencies ([d957494](https://github.com/ptarmiganlabs/butler/commit/d9574944a21e8a4e9f8742d0c8e13f5dd4dc7a42))
* Source code formatting ([f8b6e1c](https://github.com/ptarmiganlabs/butler/commit/f8b6e1cd0cc6c08f10fbd42597ba3eb5b249e040))

### [7.3.2](https://github.com/ptarmiganlabs/butler/compare/butler-v7.3.1...butler-v7.3.2) (2022-04-25)


### Bug Fixes

* Add New Relic fields to sample/template config file ([9f7db18](https://github.com/ptarmiganlabs/butler/commit/9f7db18e3e09c72a1418325cdf575c3b99adf2c8)), closes [#411](https://github.com/ptarmiganlabs/butler/issues/411)


### Miscellaneous

* **deps:** Update dependencies to latest versions. ([a0f6b8d](https://github.com/ptarmiganlabs/butler/commit/a0f6b8d08d74ee4552a25a4eef976876f1f37acc))
* **master:** release butler 7.3.1 ([acb67bb](https://github.com/ptarmiganlabs/butler/commit/acb67bb5db3a87453f03e60f2bef32c051fdca44))

### [7.3.1](https://github.com/ptarmiganlabs/butler/compare/butler-v7.3.0...butler-v7.3.1) (2022-04-25)


### Bug Fixes

* Add New Relic fields to sample/template config file ([9f7db18](https://github.com/ptarmiganlabs/butler/commit/9f7db18e3e09c72a1418325cdf575c3b99adf2c8)), closes [#411](https://github.com/ptarmiganlabs/butler/issues/411)


### Miscellaneous

* **deps:** Update dependencies to latest versions. ([a0f6b8d](https://github.com/ptarmiganlabs/butler/commit/a0f6b8d08d74ee4552a25a4eef976876f1f37acc))

## [7.3.0](https://github.com/ptarmiganlabs/butler/compare/butler-v7.2.1...butler-v7.3.0) (2022-04-25)


### Features

* Add rate limiting to Butler's REST API ([852346d](https://github.com/ptarmiganlabs/butler/commit/852346d3e5ad33255e31fae54974d93db874a465)), closes [#403](https://github.com/ptarmiganlabs/butler/issues/403)
* Optionally send uptime metrics to New Relic ([4417a3a](https://github.com/ptarmiganlabs/butler/commit/4417a3a253e0fa638bc0c2ff1f3e59b672cf53a8)), closes [#398](https://github.com/ptarmiganlabs/butler/issues/398)
* Send failed/aborted task events to New Relic ([575f256](https://github.com/ptarmiganlabs/butler/commit/575f2562c375554ed12d85bca87b14f20a020641)), closes [#400](https://github.com/ptarmiganlabs/butler/issues/400)


### Bug Fixes

* Better parsing of Sense log files before sent to Teams/Slack ([b95ad05](https://github.com/ptarmiganlabs/butler/commit/b95ad05078faa22009b9a38a122d426a282dea35)), closes [#408](https://github.com/ptarmiganlabs/butler/issues/408)
* Include Signl4 status in telemetry data ([0f21774](https://github.com/ptarmiganlabs/butler/commit/0f217745f02e772c0733422721ca6d29ddd1f83e)), closes [#402](https://github.com/ptarmiganlabs/butler/issues/402)
* Incorrect telemetry status (true/false) for uptime data sent to InfluxDB ([9eb7ebd](https://github.com/ptarmiganlabs/butler/commit/9eb7ebd1dcbea66a08e3d53062ae15ab2bc90279)), closes [#401](https://github.com/ptarmiganlabs/butler/issues/401)


### Miscellaneous

* **deps:** update dependency jest to v28 ([f3df976](https://github.com/ptarmiganlabs/butler/commit/f3df97616b1730b0dc5cc6ea194f9dbdf92686ce))
* **deps:** update node.js to v18 ([433b9dc](https://github.com/ptarmiganlabs/butler/commit/433b9dc8721719c8adf03ec8c9ee3ff64f134dcb))
* **deps:** Updated dependencies ([99a84a5](https://github.com/ptarmiganlabs/butler/commit/99a84a59138cba81cd07d1c8ce0d5fcacb5ead0c))

### [7.2.1](https://github.com/ptarmiganlabs/butler/compare/butler-v7.2.0...butler-v7.2.1) (2022-04-19)


### Miscellaneous

* **deps:** Pin dev dependencies ([871f9fb](https://github.com/ptarmiganlabs/butler/commit/871f9fb90483fd56eda0bf74b867d44120d5450a))
* **deps:** Update dependencies to latest versions ([7d18589](https://github.com/ptarmiganlabs/butler/commit/7d185891de6e5cac417458d726524e1e74ea9ca3))

## [7.2.0](https://github.com/ptarmiganlabs/butler/compare/butler-v7.1.4...butler-v7.2.0) (2022-04-07)


### Features

* Create standalone binaries for Win, macOS, Linux ([6ae4e43](https://github.com/ptarmiganlabs/butler/commit/6ae4e438003328aa398e384ecd943d585f9c5c00))
* Store failed reload logs to disk for later analysis ([137dd60](https://github.com/ptarmiganlabs/butler/commit/137dd606cc139e51aeb1bb9b3bc91dd37c163c4d))


### Bug Fixes

* Better error checking when calling Sense APIs ([3b3d76e](https://github.com/ptarmiganlabs/butler/commit/3b3d76e2b10e3a519cbdc93f45fe24df836ac9dc)), closes [#386](https://github.com/ptarmiganlabs/butler/issues/386)
* Clean up Docker image and release ZIP files ([cb715b9](https://github.com/ptarmiganlabs/butler/commit/cb715b9778dc800c42e2cba6cbe37e1cadb6f2ac)), closes [#361](https://github.com/ptarmiganlabs/butler/issues/361)
* Handle long script logs in MS Teams ([98ddbe3](https://github.com/ptarmiganlabs/butler/commit/98ddbe3fb5787b3c1dbb47825df2123f07ae6ca5)), closes [#389](https://github.com/ptarmiganlabs/butler/issues/389)
* Handle long script logs in Slack notifications without crashing. ([d43e024](https://github.com/ptarmiganlabs/butler/commit/d43e0249972be22086906f9be8cbb6b04b8f62c9)), closes [#388](https://github.com/ptarmiganlabs/butler/issues/388)
* Verify new CI 1 ([4cf92a3](https://github.com/ptarmiganlabs/butler/commit/4cf92a3366be90008d7bba3d6c73c58d1d2b1ded))


### Miscellaneous

* **deps:** pin dependency jest to 27.5.1 ([6326d20](https://github.com/ptarmiganlabs/butler/commit/6326d2066597b7dc5f3cb2d9331bfc60d3a4bcca))
* **deps:** Pin versions of dev dependencies ([723da92](https://github.com/ptarmiganlabs/butler/commit/723da92970fb6ca15882374268b50d31a5541e2c))
* **deps:** Update dependencies ([e6cae58](https://github.com/ptarmiganlabs/butler/commit/e6cae580866631aa1dd80cb487ae67e489fe75d2))

### [7.1.4](https://github.com/ptarmiganlabs/butler/compare/butler-v7.1.4...butler-v7.1.4) (2022-03-28)


### Bug Fixes

* Refactor CI ([98376a8](https://github.com/ptarmiganlabs/butler/commit/98376a86306a87bb0f286e4cf4591bd39c56e0ef))


### Miscellaneous

* **master:** release butler 7.1.4 ([ea2f0b5](https://github.com/ptarmiganlabs/butler/commit/ea2f0b5c8fe96e69eb153a5bfb6cc1092ef5efd7))
* **master:** release butler 7.1.4 ([581c629](https://github.com/ptarmiganlabs/butler/commit/581c62972df8f977a52f90794cc1b940ab7faac0))

### [7.1.4](https://github.com/mountaindude/butler/compare/butler-v7.1.4...butler-v7.1.4) (2022-03-27)


### Miscellaneous

* **master:** release butler 7.1.3 ([4542e94](https://github.com/mountaindude/butler/commit/4542e941fd1843bd2a24921ad50b6ead7095d969))
* **master:** release butler 7.1.4 ([581c629](https://github.com/mountaindude/butler/commit/581c62972df8f977a52f90794cc1b940ab7faac0))

### [7.1.4](https://github.com/mountaindude/butler/compare/butler-v7.1.3...butler-v7.1.4) (2022-03-27)


### Miscellaneous

* **master:** release butler 7.1.3 ([4542e94](https://github.com/mountaindude/butler/commit/4542e941fd1843bd2a24921ad50b6ead7095d969))

### [7.1.3](https://github.com/ptarmiganlabs/butler/compare/butler-v7.1.2...butler-v7.1.3) (2022-03-24)


### Bug Fixes

* **deps:** update dependency eslint-config-prettier to v8.5.0 ([cdbc60b](https://github.com/ptarmiganlabs/butler/commit/cdbc60b1d1cffcd61945e245b97772cbc6c3e9e1))
* **deps:** update dependency fastify-swagger to v5 ([d9a89fe](https://github.com/ptarmiganlabs/butler/commit/d9a89fee02c17548925c7a7d66837901adeb0736))
* **deps:** update dependency nodemailer-express-handlebars to v5 ([a9ab9c2](https://github.com/ptarmiganlabs/butler/commit/a9ab9c2f69373526445a44937f3913de83d06dd5))
* Update dep Prettier ([46c96fa](https://github.com/ptarmiganlabs/butler/commit/46c96fa81aa7ea5e63cace795d264c7dc9d0d88c))


### Miscellaneous

* **deps:** update dependency express-handlebars to 5.3.1 [security] ([616a07e](https://github.com/ptarmiganlabs/butler/commit/616a07ee38d943658e6c42145b4d758213b63929))
* Update dependencies ([daaf3e2](https://github.com/ptarmiganlabs/butler/commit/daaf3e2f4ffbd06d7d6a6247e06341584da844c5))

### [7.1.2](https://github.com/ptarmiganlabs/butler/compare/butler-v7.1.1...butler-v7.1.2) (2022-02-15)


### Bug Fixes

* **deps:** update dependency axios to ^0.26.0 ([71ef323](https://github.com/ptarmiganlabs/butler/commit/71ef323d1c73d4a4d80169c2c52c565473c02d72))


### Refactoring

* Better logging for API file operations endpoints ([0001e7d](https://github.com/ptarmiganlabs/butler/commit/0001e7d2f8b69791e0fa858fa030262fdd634431)), closes [#348](https://github.com/ptarmiganlabs/butler/issues/348)


### Miscellaneous

* **deps:** update dependency jest to v27.5.1 ([9399294](https://github.com/ptarmiganlabs/butler/commit/9399294d075d35787c20580b618351a4c4130964))
* **deps:** update dependency snyk to v1.852.0 ([943c448](https://github.com/ptarmiganlabs/butler/commit/943c448a85b1815e103a158a369fbaa3a042422c))

### [7.1.1](https://github.com/ptarmiganlabs/butler/compare/butler-v7.1.0...butler-v7.1.1) (2022-01-27)


### Bug Fixes

* **deps:** update dependency axios to ^0.25.0 ([710af09](https://github.com/ptarmiganlabs/butler/commit/710af096f29e396684e2b3a411d79c7a12431a60))
* **deps:** update dependency axios to ^0.25.0 ([9fd90b4](https://github.com/ptarmiganlabs/butler/commit/9fd90b40df9cba852969e88f8562564d323d43fd))
* src/package.json & src/package-lock.json to reduce vulnerabilities ([c7c7e77](https://github.com/ptarmiganlabs/butler/commit/c7c7e77be4171b9db161c8c42f4265f7ee444a48))


### Miscellaneous

* **deps:** bump follow-redirects from 1.14.4 to 1.14.7 in /src ([a4efb32](https://github.com/ptarmiganlabs/butler/commit/a4efb32d7c7e568f1d4ebeea649c08b5a9cc1bda))
* **deps:** Update dependencies ([9ea062f](https://github.com/ptarmiganlabs/butler/commit/9ea062f1bfd955c7bc4e4117ce8d72bb81d8a5b1))
* **deps:** update dependency jest to v27.4.7 ([3cd7ce7](https://github.com/ptarmiganlabs/butler/commit/3cd7ce7b13a24d4436b89b3dfeeca4e083f84bbe))
* **deps:** update dependency snyk to v1.838.0 ([6560572](https://github.com/ptarmiganlabs/butler/commit/6560572f25b1462e3170de05249be9938188061d))
* **deps:** Upgrade dependencies ([637ae47](https://github.com/ptarmiganlabs/butler/commit/637ae47a3b8de5905724b427a528562db10ac8d8))
* Update dependencies ([bba2973](https://github.com/ptarmiganlabs/butler/commit/bba2973a507b42948df82d00a44391537e3a6f46))

## [7.1.0](https://github.com/ptarmiganlabs/butler/compare/butler-v7.0.6...butler-v7.1.0) (2021-12-30)


### Features

* Add control of what tasks can be started by Butler ([92639e4](https://github.com/ptarmiganlabs/butler/commit/92639e49b3af2ac78dd313ef0ab43983c48cb1ea))
* **api:** Verify that task IDs are valid ([a6612e1](https://github.com/ptarmiganlabs/butler/commit/a6612e137fe8fac864e10f471edbf00c75d95c1f)), closes [#319](https://github.com/ptarmiganlabs/butler/issues/319)
* Refactor API for starting tasks. Add magic task guid "-". ([90613d5](https://github.com/ptarmiganlabs/butler/commit/90613d54d1266c66ab93d077e26485f089fa825d)), closes [#326](https://github.com/ptarmiganlabs/butler/issues/326)
* Show URL to API docs page on Butler startup ([98b4518](https://github.com/ptarmiganlabs/butler/commit/98b4518f4e9f5b8c1467012482e4ee038ed29122))


### Bug Fixes

* **api:** API calls with http Expect header fails ([3707f3e](https://github.com/ptarmiganlabs/butler/commit/3707f3e3c6fa505e57ffa864a1d46a903d366d7e))
* Increase timeout in API test cases ([9beb6fe](https://github.com/ptarmiganlabs/butler/commit/9beb6fe86db93f07dc55cd0b58689cc964ab08e9)), closes [#329](https://github.com/ptarmiganlabs/butler/issues/329)
* Use correct return body format in API docs ([1862b92](https://github.com/ptarmiganlabs/butler/commit/1862b92fc2ee1a7d37b6e430d4121cf4cf16e5f5))
* Use correct return body format in scheduler API docs ([faaa361](https://github.com/ptarmiganlabs/butler/commit/faaa3616aebfbb709652c387999f956cc35563e3))


### Refactoring

* Add test cases for Expect: 100-continue header ([ddea1b3](https://github.com/ptarmiganlabs/butler/commit/ddea1b3c39750d00465bd9d2b4087829c93c5d82)), closes [#323](https://github.com/ptarmiganlabs/butler/issues/323)
* Add test cases for start task API ([da320f0](https://github.com/ptarmiganlabs/butler/commit/da320f0a3952d0a43b82d70783b2f620317c46ad)), closes [#320](https://github.com/ptarmiganlabs/butler/issues/320)
* Replace deprecated later library with @breejs/later ([346be74](https://github.com/ptarmiganlabs/butler/commit/346be7455ea681b2484c42e24900dfe733026aec)), closes [#280](https://github.com/ptarmiganlabs/butler/issues/280)


### Miscellaneous

* **deps:** Update dependencies ([f67a6db](https://github.com/ptarmiganlabs/butler/commit/f67a6db6edca7ef197088cc9812d9e097f94caf0))
* **deps:** Updated dependencies ([a15f594](https://github.com/ptarmiganlabs/butler/commit/a15f594bdde4f4bff0ee5b01f98a120228a9498f))
* Update dependencies ([8b3ef44](https://github.com/ptarmiganlabs/butler/commit/8b3ef44cae44a631cf00e5ad9272d7f63ef444d6))
* Update dependencies ([b72ec44](https://github.com/ptarmiganlabs/butler/commit/b72ec447920c99d2d8bf4c1bf53c0bbd448fa60a))


### Documentation

* Add missing lastKnownState to scheduler docs ([37baf36](https://github.com/ptarmiganlabs/butler/commit/37baf367b3521f2e666915dfa93e86ad6c9efd77))
* Document all test cases ([3f2a761](https://github.com/ptarmiganlabs/butler/commit/3f2a761a096e7bf411d15826c884953fc6792d53))
* Fix API docs for starting tasks ([378ff75](https://github.com/ptarmiganlabs/butler/commit/378ff75047f6ec6bde345f525ea119472ed15699)), closes [#335](https://github.com/ptarmiganlabs/butler/issues/335)
* Update template config file wrt new features ([102f106](https://github.com/ptarmiganlabs/butler/commit/102f10647eb01b99f83724876501527650eb0d41))

### [7.0.6](https://www.github.com/ptarmiganlabs/butler/compare/butler-v7.0.5...butler-v7.0.6) (2021-12-10)


### Bug Fixes

* Add better logging around QRS calls ([173dfb5](https://www.github.com/ptarmiganlabs/butler/commit/173dfb55406eb8291f86bb88941d96ff9f12306b))


### Miscellaneous

* **deps:** pin dependencies ([f3d6ddd](https://www.github.com/ptarmiganlabs/butler/commit/f3d6ddd8adfccf7841c0caa33bea82a37f7a7651))
* **deps:** update dependency jest to v27.4.4 ([8d87932](https://www.github.com/ptarmiganlabs/butler/commit/8d87932ea45af81afb968fd4da3ade0d1b07a525))
* **deps:** update dependency snyk to v1.788.0 ([013bd61](https://www.github.com/ptarmiganlabs/butler/commit/013bd61a55262d2c2a0a10f6c3bac7ae41b3ca17))
* **deps:** Updated dependencies ([dac09bc](https://www.github.com/ptarmiganlabs/butler/commit/dac09bce72a1aa38e134ed3f1ba4561b77e390da))

### [7.0.5](https://www.github.com/ptarmiganlabs/butler/compare/butler-v7.0.4...butler-v7.0.5) (2021-12-08)


### Miscellaneous

* **deps:** Update dependencies ([d8c8d41](https://www.github.com/ptarmiganlabs/butler/commit/d8c8d41c407cdae519d23e302d2259837d65f533))

### [7.0.4](https://www.github.com/ptarmiganlabs/butler/compare/butler-v7.0.3...butler-v7.0.4) (2021-12-07)


### Miscellaneous

* **deps:** update dependency snyk to v1.785.0 ([f9e590e](https://www.github.com/ptarmiganlabs/butler/commit/f9e590e51bc3e6d828114ad2d9a2aa1deabcf9e5))

### [7.0.3](https://www.github.com/ptarmiganlabs/butler/compare/butler-v7.0.2...butler-v7.0.3) (2021-12-01)


### Bug Fixes

* **alerts:** Graceful handling of empty include/exclude lists in config file ([b3a5224](https://www.github.com/ptarmiganlabs/butler/commit/b3a5224a28ce6da6e3dd493401a83612ce58ae93))
* **alerts:** Handle app owners w/o email addresses ([5375ce6](https://www.github.com/ptarmiganlabs/butler/commit/5375ce666db7a873950c0957423a12de331dbaea))
* **docker:** Change docker-compose to use latest version of Docker image ([5997981](https://www.github.com/ptarmiganlabs/butler/commit/5997981a5ff5cd3d89d38164b5e3e2de7fc81617))
* **telemetry:** Better error handling when telemetry sending fails. ([9edf76c](https://www.github.com/ptarmiganlabs/butler/commit/9edf76c7cc7b83f1ba59f3fd97d8c25638032735))
* **telemetry:** Better error handling when telemetry sending fails. ([bd18ef1](https://www.github.com/ptarmiganlabs/butler/commit/bd18ef12bd0223cd05a66c8467100aec4b7a818e))
* **telemetry:** Increase telemetry sending timeout ([b325838](https://www.github.com/ptarmiganlabs/butler/commit/b3258385454df566faa438b7a4b591e30c00c484))


### Miscellaneous

* **deps:** Update dependencies ([53cfb3a](https://www.github.com/ptarmiganlabs/butler/commit/53cfb3a0bc0e8306b212fac810eee02cc0a97f72))

### [7.0.2](https://www.github.com/ptarmiganlabs/butler/compare/butler-v7.0.1...butler-v7.0.2) (2021-12-01)


### Miscellaneous

* **deps:** update ptarmiganlabs/butler docker tag to v7.0.1 ([9019c01](https://www.github.com/ptarmiganlabs/butler/commit/9019c010679591bee7d761653240019273c86cce))
* **deps:** Updated all dependencies ([e5bd6ad](https://www.github.com/ptarmiganlabs/butler/commit/e5bd6adb4f73c764514d8c24db03b3eb57465759))

### [7.0.1](https://www.github.com/ptarmiganlabs/butler/compare/butler-v7.0.0...butler-v7.0.1) (2021-11-18)


### Bug Fixes

* **deps:** Updated dependencies ([348f6c1](https://www.github.com/ptarmiganlabs/butler/commit/348f6c1befd6e500159d056899795cd5ea8edc6f))


### Miscellaneous

* **deps:** update dependency snyk to v1.753.0 ([5a5e686](https://www.github.com/ptarmiganlabs/butler/commit/5a5e686739ec6f2db868395ed361255d9b71c847))
* **deps:** update dependency snyk to v1.760.0 ([d885b24](https://www.github.com/ptarmiganlabs/butler/commit/d885b245cfb76722e13636d1b9d641ee043311ee))
* **deps:** update ptarmiganlabs/butler docker tag to v7 ([665a2ab](https://www.github.com/ptarmiganlabs/butler/commit/665a2abf98e40ee25f541ac6c5f01a02136393fd))
* **deps:** update ptarmiganlabs/butler docker tag to v7 ([#287](https://www.github.com/ptarmiganlabs/butler/issues/287)) ([24b38c7](https://www.github.com/ptarmiganlabs/butler/commit/24b38c733f37920fc737d3f5d7f77a20460ab123))

## [7.0.0](https://www.github.com/ptarmiganlabs/butler/compare/butler-v6.1.1...butler-v7.0.0) (2021-11-03)


### ⚠ BREAKING CHANGES

* Consistent property names  from reloadtask call
* Incorrect return code when creating schedule
* Remove session/connection monitoring

### Features

* Add API endpoint to get low-level scheduler status ([5094e7c](https://www.github.com/ptarmiganlabs/butler/commit/5094e7c4e72e940846697d24a2b152f3747070ee)), closes [#269](https://www.github.com/ptarmiganlabs/butler/issues/269)
* Add API for starting/stopping all schedules ([e6c76ed](https://www.github.com/ptarmiganlabs/butler/commit/e6c76ed2b173825cf14be4c0be5f39a1a451d444)), closes [#261](https://www.github.com/ptarmiganlabs/butler/issues/261)
* Add tests for all API endpoints ([5078b9a](https://www.github.com/ptarmiganlabs/butler/commit/5078b9a8d28b5a59d0109b0c16ba22d8d9b472f3)), closes [#271](https://www.github.com/ptarmiganlabs/butler/issues/271)
* Remove session/connection monitoring ([272d0c9](https://www.github.com/ptarmiganlabs/butler/commit/272d0c9b54e624ae87cb17e4b8de541d4479307d)), closes [#254](https://www.github.com/ptarmiganlabs/butler/issues/254)


### Bug Fixes

* Consistent property names  from reloadtask call ([c6127cb](https://www.github.com/ptarmiganlabs/butler/commit/c6127cbcd8a582c0fb8cda23883e9728f1fe9bcd)), closes [#279](https://www.github.com/ptarmiganlabs/butler/issues/279)
* Consistent re-write of remoteIp in http response ([8740e61](https://www.github.com/ptarmiganlabs/butler/commit/8740e61a63c67a212db6a3e4ced432b7d73e624a)), closes [#256](https://www.github.com/ptarmiganlabs/butler/issues/256)
* Consistent return body when starting task ([94aedb6](https://www.github.com/ptarmiganlabs/butler/commit/94aedb676a6896ca905614fe1e6a5ce981936a34)), closes [#266](https://www.github.com/ptarmiganlabs/butler/issues/266)
* Correct error msg when getting app owner ([02999f6](https://www.github.com/ptarmiganlabs/butler/commit/02999f65b91c46f3fa9e3651273ec86abecd2fac)), closes [#181](https://www.github.com/ptarmiganlabs/butler/issues/181)
* **docker:** Docker healthcheck now working ([a3c6d1d](https://www.github.com/ptarmiganlabs/butler/commit/a3c6d1d3d2f811e106324d005e0fc8425cf1f23c)), closes [#255](https://www.github.com/ptarmiganlabs/butler/issues/255)
* File copy/move now respect options passed in ([daf91df](https://www.github.com/ptarmiganlabs/butler/commit/daf91df98c711a35b273c9fc4e98da7f076c4fc1)), closes [#263](https://www.github.com/ptarmiganlabs/butler/issues/263)
* Incorrect return code when creating schedule ([d41b6c4](https://www.github.com/ptarmiganlabs/butler/commit/d41b6c4c15c9561af3b4727334555b70261efa86)), closes [#277](https://www.github.com/ptarmiganlabs/butler/issues/277)
* Incorrect sample schedule file ([ab4570a](https://www.github.com/ptarmiganlabs/butler/commit/ab4570aac263014234c3f7a0abc85a4bc2f6db3a))
* Return 201 + appId in body ([93ecfab](https://www.github.com/ptarmiganlabs/butler/commit/93ecfab893f84cb67fe5708d73a6c9d6eccddcd5)), closes [#267](https://www.github.com/ptarmiganlabs/butler/issues/267)
* Return 201 vs 200 after creating KV entry ([b9f235b](https://www.github.com/ptarmiganlabs/butler/commit/b9f235b5209a6dd3bfa0a917dd826681de27c70b)), closes [#264](https://www.github.com/ptarmiganlabs/butler/issues/264)
* Return proper JSON from successful API calls ([6ed4771](https://www.github.com/ptarmiganlabs/butler/commit/6ed47713b068fb672ae8e484d67dd3189c12c8e5)), closes [#260](https://www.github.com/ptarmiganlabs/butler/issues/260)
* Sort API endpoints in docs ([a76fb4b](https://www.github.com/ptarmiganlabs/butler/commit/a76fb4b79bc17e62a367d7062578b82a685edbd7)), closes [#268](https://www.github.com/ptarmiganlabs/butler/issues/268)


### Refactoring

* Consistent formatting and linting ([3b68097](https://www.github.com/ptarmiganlabs/butler/commit/3b6809713aa0644fca79afb3e6884e2e4b41eb1c))
* Fix spelling of variable ([ed4a726](https://www.github.com/ptarmiganlabs/butler/commit/ed4a72639a2e264086f168ba7ccb041bd6f04919)), closes [#272](https://www.github.com/ptarmiganlabs/butler/issues/272)
* Source code formatting and linting ([681020b](https://www.github.com/ptarmiganlabs/butler/commit/681020bf779a54bd89af758d3b9ed6bf758eace2))


### Documentation

* Add Docker examples in config file ([6540668](https://www.github.com/ptarmiganlabs/butler/commit/6540668be4e1a9694fd32836e6f6f5862c40c2fd)), closes [#253](https://www.github.com/ptarmiganlabs/butler/issues/253)
* Add missing field in /schedules response ([3803787](https://www.github.com/ptarmiganlabs/butler/commit/38037879d59450d3c1d5c4503d939bdb9bd40d05)), closes [#278](https://www.github.com/ptarmiganlabs/butler/issues/278)
* Fix docs for /v4/reloadtask/:taskId/start ([4c7368c](https://www.github.com/ptarmiganlabs/butler/commit/4c7368ceb4add6923d12656d2b5cca28fb1e7c5a)), closes [#265](https://www.github.com/ptarmiganlabs/butler/issues/265)
* Fix incorrect text for MQTT publish ([a84c9a7](https://www.github.com/ptarmiganlabs/butler/commit/a84c9a76cbb4b65bf6c8a4f3483025a509bfab76)), closes [#262](https://www.github.com/ptarmiganlabs/butler/issues/262)
* Publish MQTT msg return body ([296a21b](https://www.github.com/ptarmiganlabs/butler/commit/296a21b00e5854e8980dba12f636a91a6385cda8)), closes [#276](https://www.github.com/ptarmiganlabs/butler/issues/276)
* Remove ttl from KV response body ([8d86076](https://www.github.com/ptarmiganlabs/butler/commit/8d86076a0a76c86143e788f79f9278ee7a891038)), closes [#273](https://www.github.com/ptarmiganlabs/butler/issues/273)
* Signl4 integration + docs site ([a7280a7](https://www.github.com/ptarmiganlabs/butler/commit/a7280a7ce816cba7ec082fbc3cbea440b815570b))


### Miscellaneous

* **deps:** Update dependencies ([ca57f73](https://www.github.com/ptarmiganlabs/butler/commit/ca57f73af9a78ddc6fd805c8be8ddc4d9c2628a9))
* **deps:** Updated dependencies ([fcaf88e](https://www.github.com/ptarmiganlabs/butler/commit/fcaf88ed15378ddc749e1278fdfee95e89ae8fce))
* **deps:** Updated dependencies ([6a65bda](https://www.github.com/ptarmiganlabs/butler/commit/6a65bda7987f6dcd259e947e8b48e81a6437d41a))
* Source code formatting ([6153554](https://www.github.com/ptarmiganlabs/butler/commit/61535541af32f11e58225cdce6dcc2637faf29e1))

### [6.1.1](https://www.github.com/ptarmiganlabs/butler/compare/butler-v6.1.0...butler-v6.1.1) (2021-10-21)


### Miscellaneous

* **deps:** update dependency snyk to v1.741.0 ([a3e3b9b](https://www.github.com/ptarmiganlabs/butler/commit/a3e3b9bf1bdce462a4a0b06248b8c8b0cf7b2154))
* **deps:** update dependency snyk to v1.742.0 ([49c1b48](https://www.github.com/ptarmiganlabs/butler/commit/49c1b4848453a2175f1a2664f4b485a663b7332f))

## [6.1.0](https://www.github.com/ptarmiganlabs/butler/compare/butler-v6.0.4...butler-v6.1.0) (2021-10-19)


### Features

* **API:** Add POST endpoint for starting tasks ([ba214c7](https://www.github.com/ptarmiganlabs/butler/commit/ba214c74086a9fc86461bebd62fccc5a63441847)), closes [#185](https://www.github.com/ptarmiganlabs/butler/issues/185)
* **api:** Start tasks based on tags, CPs, task array ([55c8eee](https://www.github.com/ptarmiganlabs/butler/commit/55c8eee123deb68cae446aec9563907e41482c5b))


### Bug Fixes

* **API:** API calls logs IP or calling IP ([f36c56c](https://www.github.com/ptarmiganlabs/butler/commit/f36c56c93465e79c696d375c58ffa6a263930402)), closes [#242](https://www.github.com/ptarmiganlabs/butler/issues/242)
* Logging of REST calls now respect config file ([3e1431e](https://www.github.com/ptarmiganlabs/butler/commit/3e1431e73301de96ec1c0f21ee162cc306b75c32))


### Miscellaneous

* **deps:** Update dependencies ([947442c](https://www.github.com/ptarmiganlabs/butler/commit/947442cce7829b24411a430c6c86bea3b100484a))
* **deps:** Update dependencies ([01d7267](https://www.github.com/ptarmiganlabs/butler/commit/01d72676a8bbfa1b0f4b182aabd7f6e3fe6f7bab))
* **deps:** Updated dependencies ([afe621a](https://www.github.com/ptarmiganlabs/butler/commit/afe621a73798c955a984fc9a0c7ba9298a29764b))
* **Docker:** Update image version in docker-compose ([813c71c](https://www.github.com/ptarmiganlabs/butler/commit/813c71cc2a1e18af3bae0ffec85a29a76d1c77dd))

### [6.0.4](https://www.github.com/ptarmiganlabs/butler/compare/butler-v6.0.3...butler-v6.0.4) (2021-10-14)


### Miscellaneous

* **deps:** update ptarmiganlabs/butler docker tag to v6 ([e0826b8](https://www.github.com/ptarmiganlabs/butler/commit/e0826b8c8886e39dd24987c0be5a4bf4b1feb9af))

### [6.0.3](https://www.github.com/ptarmiganlabs/butler/compare/butler-v6.0.2...butler-v6.0.3) (2021-10-13)


### Documentation

* Update src readme ([c40e9f5](https://www.github.com/ptarmiganlabs/butler/commit/c40e9f52de8d498865b7e1c90cf0e4cbf7bd5d85))

### [6.0.2](https://www.github.com/ptarmiganlabs/butler/compare/butler-v6.0.1...butler-v6.0.2) (2021-10-13)


### Documentation

* Update src readme ([be92f88](https://www.github.com/ptarmiganlabs/butler/commit/be92f88e4775573f120ec3da2ff9daecfa4b901d))

### [6.0.1](https://www.github.com/ptarmiganlabs/butler/compare/butler-v6.0.0...butler-v6.0.1) (2021-10-13)


### Documentation

* Added src readme ([0b7465a](https://www.github.com/ptarmiganlabs/butler/commit/0b7465a68a7d761696ebf6a3958fdcf0ebd50140))

## 6.0.0 (2021-10-13)


### ⚠ BREAKING CHANGES

* File copy/move now returns 201
* MQTT message now taken from body
* Refactor the entire REST API

### Features

* **api:** Make error messages more descriptive ([dde2c42](https://www.github.com/ptarmiganlabs/butler/commit/dde2c42ff823940cade218d06682be48f1df7732)), closes [#224](https://www.github.com/ptarmiganlabs/butler/issues/224)


### Bug Fixes

* File copy/move now returns 201 ([86d63ca](https://www.github.com/ptarmiganlabs/butler/commit/86d63ca4206befbc5a0fb19269e081e9de5e42b2)), closes [#216](https://www.github.com/ptarmiganlabs/butler/issues/216)
* Key-value store now working as intended ([4fb9201](https://www.github.com/ptarmiganlabs/butler/commit/4fb92013e87a923dd3f32b9a9db945fa88b59f31)), closes [#222](https://www.github.com/ptarmiganlabs/butler/issues/222)
* MQTT message now taken from body ([a92bdf1](https://www.github.com/ptarmiganlabs/butler/commit/a92bdf1d593a2beefda4127dc2b988573504ce27)), closes [#217](https://www.github.com/ptarmiganlabs/butler/issues/217)
* **security:** Better cert handling, fixes [#192](https://www.github.com/ptarmiganlabs/butler/issues/192) ([da933bd](https://www.github.com/ptarmiganlabs/butler/commit/da933bd61cca16953eec3bf479710fc4b18265f0))


### Miscellaneous

* **deps:** Update dependencies ([8c17b67](https://www.github.com/ptarmiganlabs/butler/commit/8c17b67d77f82019668e076961ed9d1b3a537ffa))
* **deps:** update ptarmiganlabs/butler docker tag to v5.4.3 ([aab4459](https://www.github.com/ptarmiganlabs/butler/commit/aab44590b115c56c6042551f5c282d9bc5507659))
* Lock dev deps versions ([6707738](https://www.github.com/ptarmiganlabs/butler/commit/6707738c14adb3f8826bff43fc51036643b18980))
* release 5.4.3 ([0c95f08](https://www.github.com/ptarmiganlabs/butler/commit/0c95f08e2ce6f69fe24968d8414410ec8aaa19da))
* Update base base image for Docker builds ([e50154a](https://www.github.com/ptarmiganlabs/butler/commit/e50154a3de02db08b2f3b5ecc233a23b0651ce69))
* Update deps ([ff40aff](https://www.github.com/ptarmiganlabs/butler/commit/ff40aff685605d7433053bb220ccf5c36cd28622))
* Updated dependencies ([96a9894](https://www.github.com/ptarmiganlabs/butler/commit/96a989460f4e841999744d4d7e8d67eca6080ba3))


### Refactoring

* Add support for X-HTTP-Method-Override ([ecaa685](https://www.github.com/ptarmiganlabs/butler/commit/ecaa6853091765c001abefcec30be6a955c3c6ca)), closes [#211](https://www.github.com/ptarmiganlabs/butler/issues/211)
* Linted and formatted all source code ([368f1a7](https://www.github.com/ptarmiganlabs/butler/commit/368f1a7264f3619946868b5966d0b6a3ce2e43a0))
* Refactor the entire REST API ([da18041](https://www.github.com/ptarmiganlabs/butler/commit/da180411d25c2bd8359d0bd16d312cd677193cc3))
* Switch API docs to use Fastify ([b886f31](https://www.github.com/ptarmiganlabs/butler/commit/b886f3162b78960aedd8d1354ce8c80836e39945))

### [5.4.3](https://www.github.com/ptarmiganlabs/butler/compare/v5.4.3...v5.4.3) (2021-09-30)


### Features

* add Snyk scanning of source code ([#193](https://www.github.com/ptarmiganlabs/butler/issues/193)) ([30ff4da](https://www.github.com/ptarmiganlabs/butler/commit/30ff4da6cb085fa310a09b47207900d50c343089))
* Implements [#150](https://www.github.com/ptarmiganlabs/butler/issues/150) ([f4c4071](https://www.github.com/ptarmiganlabs/butler/commit/f4c4071b943f65ae11f76711ec9821e9827ce9fa))


### Bug Fixes

* 89 ([613b5fa](https://www.github.com/ptarmiganlabs/butler/commit/613b5fa4f837165ea9da675a644fd08aed9b0729))
* **deps:** update dependency yargs to v17 ([60fc69f](https://www.github.com/ptarmiganlabs/butler/commit/60fc69fe152009557010d723d46b7d65b3f0d20b))
* remove debug code ([e50efa5](https://www.github.com/ptarmiganlabs/butler/commit/e50efa58aad71db4f1ff1d8ac79bb59a1266b190))
* update dependencies ([5e272bb](https://www.github.com/ptarmiganlabs/butler/commit/5e272bb89863c6ad9304cc14a0c6a46795c902e6))

### [5.4.3](https://www.github.com/ptarmiganlabs/butler/compare/v5.4.2...v5.4.3) (2021-09-15)


### Features

* add Snyk scanning of source code ([#193](https://www.github.com/ptarmiganlabs/butler/issues/193)) ([30ff4da](https://www.github.com/ptarmiganlabs/butler/commit/30ff4da6cb085fa310a09b47207900d50c343089))
* Implements [#150](https://www.github.com/ptarmiganlabs/butler/issues/150) ([f4c4071](https://www.github.com/ptarmiganlabs/butler/commit/f4c4071b943f65ae11f76711ec9821e9827ce9fa))


### Bug Fixes

* 89 ([613b5fa](https://www.github.com/ptarmiganlabs/butler/commit/613b5fa4f837165ea9da675a644fd08aed9b0729))
* **deps:** update dependency yargs to v17 ([60fc69f](https://www.github.com/ptarmiganlabs/butler/commit/60fc69fe152009557010d723d46b7d65b3f0d20b))
* remove debug code ([e50efa5](https://www.github.com/ptarmiganlabs/butler/commit/e50efa58aad71db4f1ff1d8ac79bb59a1266b190))
* update dependencies ([5e272bb](https://www.github.com/ptarmiganlabs/butler/commit/5e272bb89863c6ad9304cc14a0c6a46795c902e6))
