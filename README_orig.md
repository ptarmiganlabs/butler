# Butler for Qlik Sense

Node.js based proxy app for providing features accessible from Qlik Sense load scripts. Butler also proxies events emitted from the log4net logging framework used by Sense, and forward these events to Slack, MQTT or other systems, as needed.

The app started out as a way of posting to [Slack](https://slack.com/) from [Qlik Sense](http://www.qlik.com/products/qlik-sense) (or [QlikView](http://www.qlik.com/products/qlikview)) load scripts, but has since been generalized and now supports the following features/endpoints:

- Post to Slack from Sense load scripts
      Endpoint: /slack
- Create directories on the server where Butler is running
      Endpoint: /createDir
- Check available disk space
      Endpoint: /getDiskSpace
- Publish message to MQTT topic
      Endpoint: /mqttPublishMessage
- Forward task failure notifications to Slack

- Forward user audit events (session start/stop, connection open/close) to Slack and MQTT

Other endpoints can be added if needed - ideas include linking to services like [Pushover](https://pushover.net/), sending tweets, controlling USB status lights like [Blink(1)](https://blink1.thingm.com/) etc. Given the large number of node.js modules available, it is quite easy to add new integrations.

Current work in progress is focused on having Butler subscribing to MQTT topics, and start Sense tasks based on messages arriving in those topics.
This will open up for upstream (MQTT enabled) data sources telling Sense that new data is available. Many cases where upstream sources are today polled can be avoided, with lower server load and more up-to-date data for end users as results.


Configuration
-------------
The following configuration needs to be entered in the source code (all of them marked in the source files):

- Enter the webhook URL you got when configuring incoming webhooks in Slack
- MQTT broker to be used
- IP number of server where Butler is running
- Slack channel to which task failure notifications should be posted
- Slack channel to which session start/stop and connection open/close events should be posted

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


Starting
--------
To start the proxy app:
node /path/to/app/butler.js

The app can also be managed by a node.js process monitor, such as [PM2](https://github.com/Unitech/pm2) or [Forever](https://www.npmjs.com/package/forever). Both have successfully been used with Butler. The advantage of using a process monitor is that it will automatically restart Butler if it for some reason terminates.

A rather serious, not yet resolved issue is that both PM2 and Forever seems to have trouble auto-starting node-js apps when a Windows server reboots.   
They can be configured to start when a user logs into the newly rebooted Windows server, but that extra step (logging into the server) is of course not good. Way better would be if PM2 or Forever (or some other tool) could start on server boot.  
There for sure are solutions for this - feel free to investigate, fork and send a pull request with a solution.


Usage
-----
General usage instructions follow, it is recommended to also take a look at the .qvs include files, to understand how parameters are passed etc.


- **Initialising Butler**

  Some of Butler's features require certain mapping tables etc to be in place.
  Therefore, Butler's init function should be called before any other calls to Butler are made:

      CALL ButlerInit;     // Only done once at beginning of load script

- **Send messages to Slack**

  Available emojis: http://www.emoji-cheat-sheet.com/

  Formatting of Slack messages: https://api.slack.com/docs/formatting

  Slack API docs: https://api.slack.com/incoming-webhooks

  - Calling from Sense load script:

    The code needed to post messages to Slack is found in the post_to_slack.qvs file.

    Simply include that file at the beginning of your load script, and you can then use its helper functions for posting to Slack.

    The include statement below assumes that you have a folder data connection called "Scripts", pointing to your qvs scripts.

    Finally, call the PostToSlack function from the load script. You should now get a message showing up in Slack.

        $(Include=[lib://Scripts (prod)/butler_init.qvs]);
        $(Include=[lib://Scripts (prod)/post_to_slack.qvs]);

        CALL InitButler;

        // General syntax:
        // CALL PostToSlack(channel, fromUsername, text, emoji);
        CALL PostToSlack('sense-reload-info', 'server: MyServer', '*App XYZ123*: reload starting', ':information_source:');


- **Create a new directory on disk**

  Sense's default (out of the box) security model does not allow direct interaction with the file system, as this could pose security risks. This setting can be overridden, but a better way is to keep the Sense configuration at the more secure setting, and have Butler create the directory for you.

  - Calling from Sense load script:

    The code needed to create directories using Butler is found in the  create_directory.qvs file.
    Include the qvs file into the load script, then call it:

        $(Include=[lib:/Scripts/create_directory.qvs]);
        CALL CreateDir('c:/abc/def/ghi');

      *Note: The /createDir endpoint will create the entire requested directory structure. In the above example, this means that even though c:/abc did not exist, the call will create both c:/abc, c:/abc/def and c:/abc/def/ghi*

- **Getting disk space info**

  This endpoint will return total disk size, as well as available free space on the disk/path specified in the URL parameter.

  - Calling from Sense load script:

    As the data returned from Butler is a JSON object (which Sense cannot read natively), you can use Qlik's REST connector (which handles JSON very nicely). The result will then be a table with fields for total and free disk space, respectively.

- **Publishing an MQTT message**

  Use this endpoint to post MQTT messages from the load script.

  A possible use case is to tell downstream systems (i.e. systems that depend on data in, or data created by Sense) that new data has been loaded into a particular app, written to CSV files etc.

  - Calling from Sense load script:

    The ButlerInit function must be called before the PostToMQTT function is called.

        $(Include=[lib://Scripts (prod)/butler_init.qvs]);
        $(Include=[lib://Scripts (prod)/post_to_mqtt.qvs]);

        CALL InitButler;
        CALL PostToMQTT('qliksense/my_app/last_reload', Timestamp(Now()));


- **Failed task notifications**

  Note: This is not an endpoint in Butler's REST API, but rather a combination of Sense's log4net logging library, and features built into Butler.

  When a task started by the Sense QMC fails, log4net will (if you have configured the XML file described above) send a UDP message to Butler, using port 9998.
  Butler will then forward this message to Slack, using the Slack channel defined at the top of the butler.js file.

  log4net will also send an email to the email address specified in the XML file. In this case Butler is not involved in any way.

  More information on log4net and how it is used in Sense can be found [here](http://help.qlik.com/en-US/sense/2.2/Subsystems/PlanningQlikSenseDeployments/Content/Server/Server-Logging-Using-Appenders-QSRollingFileAppender-Built-in-Appenders.htm).


- **Session start/stop, connection open/close notifications**

  Note: This is not an endpoint in Butler's REST API, but rather a combination of Sense's log4net logging library, and features built into Butler.

  When a user start or stops a session, or when a user's connection opens or closes, the log4net library will (assuming it has been configured as described above) send a UDP message to Butler, using port 9997.
  Butler will then forward this message to
  1. the Slack channel defined in butler.js, and
  2. the following MQTT topics
    * qliksense/session/start
    * qliksense/session/stop
    * qliksense/connection/open
    * qliksense/connection/close


Warning
-------
- You should make sure to configure the firewall of the server where Buter is running, so it only accepts calls from the desired clients/IP addresses.
A reasonable first approach would be to configure the firewall to only allow calls from localhost.

- As of right now the MQTT connections are not secured by certificates or passwords.
  For use within a controlled network that might be fine, but nonetheless something to keep in mind. Adding certificate based authentication (which MQTT supports) would solve this.
