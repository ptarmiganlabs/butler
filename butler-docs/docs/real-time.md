# Real time data for user sessions  

Butler listens to session start/end messages from Sense's log4net logging framework, and keeps records of both how many and which users currently have active sessions.  
Ideal would be if the Sense APIs would provide a list of currently active users, that us however currently not available. 
For that reason Butler's tactic is to listen to log events to determine when users start and end sessions.   
  
There is however a downside to this approach.  
When Butler is first started, it will not know what sessions are currently active. Instead, it will collect that inforamation as time passes.  
This means that the active user count, as well as what specific users are active, might be incorrect when Butler is first started. 
The data will then become more and more exact as users end their sessions, and later restart them (Butler will then capture the session restart, and update its data structures accordingly).
  
## Active users data as MQTT messages


