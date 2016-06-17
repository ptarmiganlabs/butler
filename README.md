# Butler for Qlik Sense

> Proxy for carrying out features that Qlik Sense or Qlikview cannot do out of the box.

## Overview

Node.js based proxy app for providing features accessible from Qlik Sense load scripts. Butler also proxies events emitted from the log4net logging framework used by Sense, and forward these events to Slack, MQTT or other systems, as needed.

The app started out as a way of posting to [Slack](https://slack.com/) from [Qlik Sense](http://www.qlik.com/products/qlik-sense) (or [QlikView](http://www.qlik.com/products/qlikview)) load scripts, but has since been generalized and now supports the following features/endpoints:

* 
Post to Slack from Sense load scripts
Endpoint: /slack

* 
Create directories on the server where Butler is running
Endpoint: /createDir

* 
Check available disk space
Endpoint: /getDiskSpace

* 
Publish message to MQTT topic
Endpoint: /mqttPublishMessage

* 
Forward task failure notifications to Slack

* 
Forward user audit events (session start/stop, connection open/close) to Slack and MQTT

Other endpoints can be added if needed - ideas include linking to services like [Pushover](https://pushover.net/), sending tweets, controlling USB status lights like [Blink(1)](https://blink1.thingm.com/) etc. Given the large number of node.js modules available, it is quite easy to add new integrations.

Current work in progress is focused on having Butler subscribing to MQTT topics, and start Sense tasks based on messages arriving in those topics.
This will open up for upstream (MQTT enabled) data sources telling Sense that new data is available. Many cases where upstream sources are today polled can be avoided, with lower server load and more up-to-date data for end users as results.

## Configuration

The following configuration needs to be entered in the source code (all of them marked in the source files):

* Enter the webhook URL you got when configuring incoming webhooks in Slack
* MQTT broker to be used
* IP number of server where Butler is running
* Slack channel to which task failure notifications should be posted
* Slack channel to which session start/stop and connection open/close events should be posted

Two additional configurations are optional (you don't have to configure them if you do not plan to use these features):

**Task failure notifications**

If forwarding of task failure events (i.e. failure of tasks started from the QMC) is to be used, the log4net XML config file (called LocalLogConfig.xml, in the log4net_task-failed directory) must be placed in the C:\ProgramData\Qlik\Sense\Scheduler directory on the Sense server where the scheduler service is running.

The XML file included in the repo contains two parts:

1. Sending emails when tasks fail. Fill in the fields enclosed by brackets, i.e. <>
2. Sending a UDP message to Butler when tasks fail. Same thing here, update text within brackets as needed

Save the XML file to the above mentioned location. The scheduler service should pick up the XML file right away, no service restart needed (probably..).

**User audit event notifications**

If forwarding of session start/stop and connection open/close messages (i.e. when users log in/out of Sense) is to be used, the log4net XML config file (this one is also named LocalLogConfig.xml, in the log4net_user-audit-event directory) must be placed in the correct directory (C:\ProgramData\Qlik\Sense\Proxy) on the Sense server where the proxy service(s) is(are) running.

The LocalLogConfig.xml file included in the repo is almost complete, update it with the IP of the server where Butler is running, then deploy it to the Sense server where the proxy service is running. Note that these can be two different servers.

If you have a Sense cluster with multiple virtual proxies, linked to different proxies, you need to deploy the XML file on all those proxy servers (assuming you want to monitor them all for session start/stop etc).

## Warning

* 
You should make sure to configure the firewall of the server where Buter is running, so it only accepts calls from the desired clients/IP addresses.
A reasonable first approach would be to configure the firewall to only allow calls from localhost.

* 
As of right now the MQTT connections are not secured by certificates or passwords.
For use within a controlled network that might be fine, but nonetheless something to keep in mind. Adding certificate based authentication (which MQTT supports) would solve this.

## Usage

```js
var qliksensebutler = require('Butler for Qlik Sense');
```

## API

<!-- add a path or glob pattern for files with code comments to use for docs  -->
{%= apidocs("index.js") %}

## Related projects

<!-- add an array of related projects, then un-escape the helper -->
{%= related([]) %}

## Running tests

Install dev dependencies:

```sh
$ npm i -d && npm test
```

## Contributing

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](https://github.com/mountaindude/qliksensebutler/issues/new).

## Author

**Göran Sander**

<!-- `github`, `github.username`, and `username` variables are undefined -->
<!-- `twitter`, `twitter.username`, and `username` variables are undefined -->

## License

Copyright © 2016 Göran Sander
Released under the MIT license.

***

_This file was generated by [verb-cli](https://github.com/assemble/verb-cli) on June 01, 2016._