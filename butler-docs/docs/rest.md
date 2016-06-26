# REST API

Butler's [REST API](https://en.wikipedia.org/wiki/Representational_state_transfer) serves several purposes.   
The main purpose of Butler's REST API is to allow various tasks to be carried out/started from a Sense load script, but the REST API can also be used by external systems (outside of the Sense environment) to communicate with Sense. The main areas are:  

1. **Provide convenient and easy access to select Sense APIs**   
Butler handles all authentication needed to talk to the Sense APIs, as well as combining multiple calls to Sense APIs, offering more high level features than those offered by Sense natively.

2. **Start Sense tasks**  
External systems (outside of Sense) can trigger Sense tasks (e.g. reload tasks). This way a database can trigger an app reload when new data is available in the database. Or a Sense load script can trigger other tasks when the execution of the script reaches certain points in the script.

3. **Send MQTT messages**  
Butler enables Sense load scripts to send [MQTT](http://mqtt.org/) messages. MQTT is a very stable and widely adopted [m2m communication](https://en.wikipedia.org/wiki/Machine_to_machine) protocol, with client libraries available in many different languages.

4. **Start Sense tasks when MQTT messages arrive**   
Butler subscribes to a certain (configurable) MQTT topic, and starts Sense tasks based on messages received in that topic.

5. **Send messages to Slack and other 3rd party services**   
Integrating [Slack](https://slack.com/) with Sense has proven extremely useful.   
From within a Sense load script it is possible to write progress info for long running reloads to Slack, notifying users that a reload has finished, notifying sysadmins that a reload has encountered some error condition etc.  
As Slack works really well across both desktop and mobile devices, Sense will benefit that cross platform feature too.  

The Slack integration supports Slack's full markdown message formatting as well as [emoijs](https://get.slack.help/hc/en-us/articles/202931348-Emoji-and-emoticons).


## REST API endpoints
