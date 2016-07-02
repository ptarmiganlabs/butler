# Examples on how to use Butler

## Call Butler REST endpoints from within Sense load scripts

While it is quite possible to call the Butler REST endpoints directly from a LOAD...FROM statement, it is usually more convenient to use the subroutine wrappers that are available as .qvs files in the sense_script folder in the Butler repository.

Before doing any calls to Butler, we should initialize things. Failing to do so might lead to errors and unpredictable responses from the Butler APIs.    

    $(Must_Include=[lib://Butler scripts/butler_init.qvs]);
    CALL ButlerInit;

Note:  

- We first include the subroutine from a .qvs file, then call it. The same concept is used throughout Butler when it comes to making use of Butler features from the Sense load script.
- The Butler qvs files are stored in a folder on the Sense server, which is linked to a data connection called "Butler scripts".  

With this taken care of, we can call any other Butler API.

### Posting to Slack
    $(Must_Include=[lib://Butler scripts/butler_init.qvs]);
    $(Must_Include=[lib://Butler scripts/post_to_slack.qvs]);

    CALL ButlerInit;
    CALL PostToSlack('sense-reload-info', 'server: sensedev1eu', '*<App name>*: reload starting', ':ghost:');	// Post a starting message to Slack
    CALL PostToSlack('sense-reload-info', subfield(OSUser(),'UserId=',2) & ' on server: ' & ComputerName(), '*Reloaded by: ' & subfield(OSUser(),'UserId=',2) & '* <App name>: Reload starting', ':test:');  

This will result in the following Slack entries:  
![alt text](img/post_to_slack_1.png "Posting to Slack")  
![alt text](img/post_to_slack_2.png "Posting to Slack")  

### Start a Sense task
    $(Must_Include=[lib://Butler scripts/butler_init.qvs]);


### Send a MQTT message

### Create a directory on disk

## Use MQTT to start Sense tasks
