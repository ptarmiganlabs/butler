# Overview

Butler is a Node.js based proxy app for providing add-on features to Qlik Sense.  
Some of the features can be used from Sense load scripts, while other provide integration with other systems.

The app started out as a way of posting to [Slack](https://slack.com/) from Qlik Sense load scripts, but has since been generalized and now supports the following high level features:


* REST endpoints that can be called from Sense load scripts or external systems.
* Event proxies used to forward messages from Sense's logging framework.
* In- and outbound MQTT messages for stable, reliable machine-to-machine communication and notifications





# REST endpoints

| Endpoint | Description |  
| -------- | ----------- |  
| `/butlerPing` | Desc |  
| `/createDir` | Create directories (anywhere in the file system) on the server where Butler is running |  
| `/createDirQVD` | Create directories (relative to a hard coded path) on the server where Butler is running |  
| `/getDiskSpace` | Check available disk space |  
| `/mqttPublishMessage` | Publish message to MQTT topic |  
| `/senseAppDump` | ... |  
| `/senseListApps` | ... |  
| `/senseQRSPing` | ... |  
| `/senseStartTask` | ... |  
| `/slackPostMessage` | Post to Slack from Sense load scripts |  


# Handler for Sense log messages
It is possible to hook into Sense's logging framework, and have log events forwarded to Butler. Once there, Butler can act as needed on the messages.  
Currently Butler forwards messages to Slack (for notifying humans that some event occurred) and MQTT (for notifying other systems that some event occurred).  
More info [here](log-events). 

# MQTT handlers
MQTT is a light weight pub-sub protocol developed for efficient machine-to-machine message sending. The protocol was developed with embedded systems (IoT and other low CPU/memory systems) in mind, and there are client implementations available in many different languages/platforms. It is also a mature protocol that has proven its stability over many years.  

Adding in- and out-bound MQTT support to Sense opens up a very interesting set of possibilities:   

* Start Sense tasks when a message arrives in a particular MQTT topic. Other systems can very easily trigger Sense reloads this way. Many cases where upstream sources are today polled can be avoided, with lower server load and more up-to-date data for end users as results.
* Send MQTT messages from Sense load script, notifying other systems that some set of files have been created and are available for consumption.
* Use as a real-time debugging channel during development of Sense apps. By sending MQTT messages from the load script, the developer can inspect the value of variables, tables etc during different parts of the reload process.


# Extending Butler
Given the richness of the Sense APIs, it is easy to add new REST endpoints that encapsulate API functions of interest.
On the other hand, given the vast number of modules in npm, it is quite easy to add integrations to additional services. Current ideas include linking to services like [Pushover](https://pushover.net/), sending tweets, controlling USB status lights like [Blink(1)](https://blink1.thingm.com/) etc.  




*
Forward user audit events (session start/stop, connection open/close) to Slack and MQTT
