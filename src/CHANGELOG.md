# Changelog

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
