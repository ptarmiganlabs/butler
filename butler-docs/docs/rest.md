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

## Versioning of the REST API
This is a very wide and complex topic in itself.  
For now Butler uses a very simple and rather naive approach, by just prefixing the endpoint name with a version number, e.g. http://FQDN/v2/EndpointName/...   
This allows Butler to support multiple versions, and old versions to be (possibly) deprecated in the future.


## REST API endpoints

### /v2/activeUserCount
      Purpose    : Get number of users that have active sessions. This value is based on session start/stop events, which means that there are corner cases where the incorrect value will be shown - for example just after starting Butler.  
      Parameters : -
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/activeUserCount
      Returns    : 5

### /v2/activeUsers
      Purpose    : Get an arrary with the usernames of users that currently have active sessions. This endpoint suffers from same limitation as the activeUserCount endpoint, i.e. it will not capture sessions that are active when Butler is started.  
      Parameters : -
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/activeUsers
      Returns    : ["userA","userB","userC"]

### /v2/base16ToBase62
      Purpose    : Convert a value coded in base16 to a base62 value. Works on arbitrary length input strings.  
      Parameters : base16
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/base16ToBase62?base16=1f5848b5f8ba4e85a57c7ca55a9e
      Returns    : 3t5Na7R7Hj5yaBCv80S

### /v2/base62ToBase16
      Purpose    : Convert a value coded in base62 to a base16 value. Works on arbitrary length input strings.  
      Parameters : base62
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/base62ToBase16?base62=0X96HlegVXzQfJVIBWC31
      Returns    : 816c8710661a0a69e51ac8dc4ccf13

### /v2/butlerPing
      Purpose    : Ask Butler if it is running and all is ok.
      Parameters : -
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/butlerPing
      Returns    : {"response":"Butler reporting for duty"}

### /v2/createDir
      Purpose    : Create a directory in any place (where the account Butler is running under has write access) on the server.  
                   Intermediate directories will be created too, i.e. if creating d:\abc\def when d:\abc does net yet exist, it will also be created.
      Parameters : directory
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/createDir?directory=d:/abc/def
      Returns    : {"directory":"d:/abc/def"}

### /v2/createDirQVD
      Purpose    : Create a directory relative to a predefined path. Can be used to ensure all QVDs are stored in a well defined location.
                   Intermediate directories will be created too, i.e. if creating d:\abc\def when d:\abc does net yet exist, it will also be created.
      Parameters : directory
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/createDirQVD?directory=abc/def
      Returns    : {"directory":"abc/def"}

### /v2/getDiskSpace
      Purpose    : Get free space information for all disks connected to the server where Butler is running.
      Parameters : path
      Returns    : curl http://<FQDN or IP of Butler>:8080/v2/getDiskSpace?path=z:/
      Example    : {"path":"z:/","available":<number>,"free":<number>,"total":<number>}

### /v2/mqttPublishMessage
      Purpose    : Publish a message to a MQTT topic, using a MQTT broker defined in the Butler config file
      Parameters : topic, message
      Example    : curl "http://<FQDN or IP of Butler>:8080/v2/mqttPublishMessage?topic=abc/def&message=ButlerTalksMQTT"
                   curl -G "http://<FQDN or IP of Butler>:8080/v2/mqttPublishMessage" --data-urlencode "topic=abc/def" --data-urlencode "message=Butler talks MQTT"
      Returns    : {"topic":"abc/def","message":"ButlerTalksMQTT"}
                   {"topic":"abc/def","message":"Butler talks MQTT"}

### /v2/senseAppDump
      Purpose    : Extracts metadata about a Sense app.
      Parameters : appId
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/senseAppDump?appId=98765e52-abcd-1234-5678-5678203b23b3
      Returns    : A long, long JSON string.

### /v2/senseListApps
      Purpose    : List name and GUID of all apps in the Sense cluster where Butler is installed.
      Parameters : -
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/senseListApps
      Returns    : A long, long JSON string.

### /v2/senseStartTask
      Purpose    : Start a Sense task. Can be used by upstream data providers to trigger reloads of Sense apps when new data is available.
      Parameters : taskId
      Example    : curl http://<FQDN or IP of Butler>:8080/v2/senseStartTask?taskId=abcd1234-5678-abcd-1234-abcd1234abcd
      Returns    : {"taskId":"abcd1234-5678-abcd-1234-abcd1234abcd"}

### /v2/slackPostMessage
      Purpose    : Post a message to a Slack channel. Normal Slack formatting options (emoijs, markdown etc) can be used.
      Parameters : channel, from_user, msg, emoij
      Example    : curl -G http://<FQDN or IP of Butler>:8080/v2/slackPostMessage --data-urlencode "channel=#sense-test-slack" --data-urlencode "msg=Butler posting to *Slack*" --data-urlencode "from_user=sa_scheduler" --data-urlencode "emoji=:test:"
      Returns    : {"channel":"#sense-test-slack","msg":"Butler posting to *Slack*","from_user":"sa_scheduler","emoji":":test:"}
