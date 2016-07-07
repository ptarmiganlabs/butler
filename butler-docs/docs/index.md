# Welcome to the Butler documentation

Butler is an open source add-on tool for Qlik Sense, extending that platform with various features, most of which are focused on integrating Sense with other systems.   
Butler makes it very easy to hook up Sense to systems like Slack or MQTT, and use these tools to send alerts when something important/interesting/urgent happen in a Sense cluster.  

Sample use cases:  

* Information about all failing tasks can be sent to a Slack channel. This gives sysadmins real-time insight into what's happening with respect to task execution.
* Trigger Sense tasks from a reload script. This makes it possible to start different Sense tasks based on what data has been read from a database, for example.
* Any messages sent to Slack can include full formatting (web links, text formatting etc), as well as "poking" users. I.e. notifying specific Slack users that they have a 
new message. Can for example be used to notify user(s) that an app has reloaded with new data, or that some error condition has occured. 
* Send and receive MQTT publish-subscribe messages. MQTT (and the pubsub concept in general) is a great way for systems to communicate reliably with each other.
* Modify the Operations Monitor app to send a daily summary of daily/weekly/monthly active users, # of failed tasks etc to a Slack channel
* ...




All project files are found [on GitHub](https://github.com/mountaindude/butler).

Use the menu to the left to access the different parts of the Butler documentation.

If you find errors in the documentation, please [open an issue in the GitHub repository](https://github.com/mountaindude/butler/issues).  
Or [fork the project](https://github.com/mountaindude/butler/issues#fork-destination-box) and contribute with enhancements.
  

Throughout this documentation the words "Qlik Sense" and "Sense" are used, both referring to the product Qlik Sense from the company Qlik.

Good luck and have fun!
