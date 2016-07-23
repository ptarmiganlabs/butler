# UDP client

Butler includes a very basic UDP client, which can be used to send test messages to Butler's UDP servers.  
This can be useful when debugging a Butler server, when adding new UDP handlers etc. 
The client is built using node.js, and is found in the src/udp_client directory.

Run the app to show its help text (in this case the UDP client is executed from a Mac):

    $ node udp_client.js
    Butler UDP client test app

    Options:
      --about, -a  This app sends messages to the UDP server(s) built into Butler
                   (or any other UDP server)
      --ip, -i     IP address of UDP server message will be sent to       [required]
      --port, -p   Port on UDP server                            [number] [required]
      --msg, -m    Message to send                         [default: "Test message"]

    Missing required arguments: ip, port
    $


## Testing the session start/stop, connection open/close UDP server

Sending a message to Butler looks like this (with a fake IP address):

    $ node udp_client.js --ip 1.2.3.4 -p 9997 -m "Abc;123;456;test"
    UDP message sent to 1.2.3.4:9997, 16 bytes.
    $   

Butler will receive the message, parse it, and a) send a message to a Slack channel (customizable in the [Butler config file](install-config/#configuration)), 
and b) publish a MQTT message to the topic specified in, again, the Butler config file.

The output to Slack looks like this (the default use of port 9997 is to handle audit events, i.e. users starting/ending sessions etc):   

![alt text](img/slack_audit_event_test_1.jpg "Slack audit event test")


## Testing the failed task UDP server

Sending a message to port 9998 will test the UDP server responsible for handling task failure messages:

Sending a message to Butler looks like this (with a fake IP address):

    $ node udp_client.js --ip 1.2.3.4 -p 9998 -m "Abc;123;456;test"
    UDP message sent to 1.2.3.4:9998, 16 bytes.
    $

The resulting Slack message looks like this:  

![alt text](img/slack_failed_task_1.jpg "Slack failed task")

