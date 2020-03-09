# Change log

## 3.0.0

This version brings a general refresh of the tool, both in terms of updated dependencies, streamlined configuration settings and more up-to-date documentation.

1. **Breaking change** Streamline the names of configuration options in the production_template.yaml config file. This change however means that the config files for existing Butler environments need to be updated. Please refer to the [documentation site](https://ptarmiganlabs.github.io/butler/install-config/#config_file_syntax) file for info on the most recent config options.
2. Each REST API endpoint can be enabled/disabled. This is useful for deployment scarios when some endpoints for whatever reasons should not be available.
3. Much improved logging of requests to the REST API endpoints. Turning on verbose logging will output lots of info on the requests, including what IP address the request comes from.
4. Better error messages when connection to Sense server for some reason fails.

## 2.2

Support for running Butler as a Docker container is finally here.

While it is still possible to run Butler as a normal Node.js app, deploying Butler as a Docker container has many benefits:

- No need to install Node.js on your server(s).
- Make use of your existing Docker runtime environments, or use those offered by Amazon, Google, Microsoft etc.
- Benefit from the extremely comprehensive tools ecosystem (monitoring, deployment etc) that is available for Docker.
- Updating Butler to the latest version is as easy as doing a "docker pull ptarmiganlabs/butler:latest".

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
