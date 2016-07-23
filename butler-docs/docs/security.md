# Security considerations
Butler uses http for its REST API. As Butler typically runs on the Sense server itself, and the firewalls of that server can be configured to protect Butler from unauthorised access, the risks can be dealt with in a reasonable way.  
Adding https would not be too hard though, node.js supports this very well.  
  
Butler uses https for all communication with Sense, using Sense's certificates for authentication. This way there is no need to set up new virtual proxies or similar in Sense.
