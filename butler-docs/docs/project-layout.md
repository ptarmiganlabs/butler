# Project layout

The GitHub repository consists of the following parts:

    butler-docs/              # Main documentation folder, created using MkDocs
      docs/                   # The configuration file
        index.md              # The documentation homepage
        ...                   # Other markdown pages, images and other files.  

    log4net_task_failed/      # Logging appender XML file
      LocalLogConfig.XML      # Forwarding of failed task events  

    log4net_user-audit-event/ # Logging appender XML files
      LocalLogConfig.XML      # Forwarding of session events  

    sense_script/             # Qlik Sense .qvs script files
      butler_init.qvs
      create_directory.qvs
      post_to_mqtt.qvs
      post_to_slack.qvs  

    src/                      # Butler source code
      config/
      mqtt/
      qrsUtil/
      rest/
      udp/
      udp_client/
      butler.js
      globals.js
      package.json
      README.md

    README.md                 # Main GitHub readme file  
