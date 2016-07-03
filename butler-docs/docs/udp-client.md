# UDP client

Butler includes a very basic UDP client, which can be used to send test messages to Butler's UDP servers.  
This can be useful when debugging a Butler server, when adding new UDP handlers etc. 

The client is built using node.js, and is found in the src/udp_client directory.

Run the app to show its help text:



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
   
   
  