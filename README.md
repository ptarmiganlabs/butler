# Butler for Qlik Sense

> Proxy app for carrying out features that Qlik Sense cannot do out of the box.

[![Known Vulnerabilities](https://snyk.io/test/github/ptarmiganlabs/butler/badge.svg?targetFile=src%2Fpackage.json)](https://snyk.io/test/github/ptarmiganlabs/butler?targetFile=src%2Fpackage.json)

## Overview

Node.js based proxy app providing various add-on features to Qlik Sense, such as starting reload tasks or posting to Slack from the load script, keeping track of currently active users and much more.  

The app started out as a way of posting to [Slack](https://slack.com/) from [Qlik Sense](http://www.qlik.com/products/qlik-sense) (or [QlikView](http://www.qlik.com/products/qlikview)) load scripts, but has since been generalized and now offers a lot more features.

This tool/micro service is one of several tools in the wider [Butler family of tools](https://github.com/ptarmiganlabs) for enhancing Qlik Sense with new capabilities.

## Version history

Available in the [changelog file](changelog.md).

## Main features

* Integration with MQTT pub-sub protocol
* Sending messages to [Slack](https://slack.com) instant messaging system
* Start Sense tasks from the load script, or from external/3rd party systems
* Send emails and MQTT messages when Sense reload tasks fail
* Real-time info on how many and what users are currently active on the Sense server(s)

## Documentation

A separate documentation site is available [here](https://ptarmiganlabs.github.io/butler).

## Sample screen shots

### Posting to Slack, including message formatting and emojis
  
---

A nice use case for posting to Slack is to notify end users when for example an app has finished reloading.  
The Slack message can then include a link to the newly reloaded app, making it a one-click operation for the end user to access the refreshed data in the app.

![alt text](butler-docs/docs/img/post_to_slack_3.png "Post to Slack")

---

### Real-time view of # of active users

The charts below were created using the dashboard components of [Node.RED](https://nodered.org/). Node.RED is truly awesome, but it is not really a first-hand choice when it comes to creating advanced dashboards.  
[Butler SOS](https://github.com/ptarmiganlabs/butler-sos) was specifically created to provide professional grade monitoring of Qlik Sense environments - feel free to check it out if you are looking for a monitoring solution for your Qlik Sense environment.

![alt text](butler-docs/docs/img/active_user_sessions.png "Active user sessions")
  
---

## Contributing

Pull requests and stars are always welcome. For bugs and feature requests, [please create an issue](https://github.com/mountaindude/qliksensebutler/issues/new).

## Author

Göran Sander
  
## License

Copyright © 2016-2018 Göran Sander
Released under the MIT license.

---
