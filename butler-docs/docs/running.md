# Running Butler

The easiest way of starting Butler is by using the normal node.js way of starting node apps:

    d:
    cd \node\butler\src
    node butler.js

It is of course also possible to put those commands in a .bat file and execute that file instead.  

## Process monitors
As Butler is the kind of service that (probably) should always be running on a server, it makes sense using a node.js process monitor to keep it alive.  
[PM2](https://github.com/Unitech/pm2) and [Forever](https://github.com/foreverjs/forever) are two process monitors that both have been successfully tested with Butler.  

One caveat with these is that it is hard to start them (and thus Butler) when a Windows server is rebooted.
PM2 can be used to solve this challenge in a nice way, more info in [this blog post](https://ptarmiganlabs.com/blog/2017/07/12/monitoring-auto-starting-node-js-services-windows-server).
