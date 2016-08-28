# Running Butler

The easiest way of starting Butler is by using the normal node.js way of starting node apps:

    d:
    cd \node\butler\src
    node butler.js

It is of course also possible to put those commands in a .bat file and execute that file instead.  

## Process monitors
As Butler is the kind of server that (probably) should always be running on a server, it makes sense using a node.js process monitor to keep it alive.  
[PM2](https://github.com/Unitech/pm2) and [Forever](https://github.com/foreverjs/forever) are two process monitors that both have been successfully tested with Butler.  

One caveat with these is that it is hard to start them (and thus Butler) when a Windows server is rebooted. 
It's easy to auto-executing the process monitor when a user logs into the server, but having the requirement that you log into the server immediately after server boot is of course less than ideal.   
[node-windows](https://www.npmjs.com/package/node-windows) has been used with some success to achieve auto-start on Windows, it is however a bit tricky to set up. 
Investigation into options is ongoing.
