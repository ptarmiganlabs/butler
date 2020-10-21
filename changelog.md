# Change log

## 4.0

### New features

- Task scheduler ([#80](https://github.com/ptarmiganlabs/butler/issues/80))
- Key-value store ([#65](https://github.com/ptarmiganlabs/butler/issues/65))
- Swagger API docs ([#76](https://github.com/ptarmiganlabs/butler/issues/76))
- Move and delete files in the file system ([#84](https://github.com/ptarmiganlabs/butler/issues/84))
- Uptime logging, incl memory usage stored in Influx db for charting/monitoring in Grafana ([#82](https://github.com/ptarmiganlabs/butler/issues/82))
- Configurable Docker healthcheck ([#73](https://github.com/ptarmiganlabs/butler/issues/73))
- Added option to send task failure notifications to MS Teams ([#83](https://github.com/ptarmiganlabs/butler/issues/83))
- Updated dependencies (adresses security issues etc)

### Breaking changes

- http method changed for some API endpoints. This means that some API endpoints are now called in different ways compared to earlier Butler versions. The parameters have also changed in some cases ([#85](https://github.com/ptarmiganlabs/butler/issues/85)).
- API endpoint names are all lowercase (previously camelCase) ([#85](https://github.com/ptarmiganlabs/butler/issues/85)).
- Some keys in the main configuration have new names.
  For example, there was not a single way of using 'enable' vs 'enabled' keys:  
  The config file had both _Butler.heartbeat.enabled_, as well as _Butler.mqttConfig.enable_.
  Confusing - in v4 only _.enable_ is used.
- In the sample `production.yaml` config file, all features are now turned off by default. This is done for several reasons: Force a thorough review of the configuration file before Butler can be used (most problems arise from incorrect config files!), performance (fewer enabled features = less memory used) and Security (fewer enabled features = fewer potential security risks).

## 3.1.0

Stayin' alive: hearbeats are here.

1. Added user configurable heartbeat option. Butler can now (optionally) do http calls to a url, indicating it is alive and well. This is useful in enterprise settings, for use together with network monitoring tools etc.
2. Updated dependencies to their latest versions.

## 3.0.0

This version brings a general refresh of the tool, both in terms of updated dependencies, streamlined configuration settings and more up-to-date documentation.

1. **Breaking change** Streamline the names of configuration options in the production_template.yaml config file. This change however means that the config files for existing Butler environments need to be updated. Please refer to the [documentation site](https://ptarmiganlabs.github.io/butler/install-config/#config_file_syntax) file for info on the most recent config options.
2. Each REST API endpoint can be enabled/disabled. This is useful for deployment scarios when some endpoints for whatever reasons should not be available.
3. Much improved logging of requests to the REST API endpoints. Turning on verbose logging will output lots of info on the requests, including what IP address the request comes from.
4. Better error messages when connection to Sense server for some reason fails.

## 2.2

Support for running Butler as a Docker container is finally here.

While it is still possible to run Butler as a normal Node.js app, deploying Butler as a Docker container has many benefits:

-   No need to install Node.js on your server(s).
-   Make use of your existing Docker runtime environments, or use those offered by Amazon, Google, Microsoft etc.
-   Benefit from the extremely comprehensive tools ecosystem (monitoring, deployment etc) that is available for Docker.
-   Updating Butler to the latest version is as easy as doing a "docker pull ptarmiganlabs/butler:latest".

## 2.1

1. Switched to using YAML config files. JSON config files will still work, but YAML is superior when it comes to readability.
2. Updated to latest versions of modules that Butler uses.
3. Removed disk space REST endpoint. This was done due to difficulties in isntalling the Windows version of the library used to get disk metrics. A full Windows development environment was needed - but as this is typically not desirable on a production Windows server, this REST endpoint was removed.
4. Removed work-in-progress code for retrieving info from Github repositories. While still a good idea, such half-baked code should not be included in actual releases.
5. Improved handling of MQTT messages and MQTT related logging.
6. Added configuration option for setting MQTT broker's port.
7. Changed name of mqttConfig.brokerIP config option to be mqttConfig.brokerHost, to better align with other tools in the Butler family.
8. Switched to using Enigma.js for talking to the Qlik Sense engine.
9. Fixed some minor issues relating to posting messages to Slack.
10. Generally improved and more consistent formatting of the source code.
11. Refined udp_client tool with better help texts.

For information about earlier versions, please see the [releases page](https://github.com/ptarmiganlabs/butler/releases).
