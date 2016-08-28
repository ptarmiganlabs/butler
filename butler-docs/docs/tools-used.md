# Tools used to create Butler
Below follows a (most likely non complete) list of tools that were used to create Butler.  
It is intended to serve as a reminder to self for how to carry out various tasks, some of which may only be occasionally used.
Thus, please treat this page for what it is...
  
On a high level, Butler development is done on OSX, using [Visual Studio Code](https://code.visualstudio.com/).  
[MkDocs](http://www.mkdocs.org/) is used to generate the documentation, which together with all files is hosted on GitHub.  


* Syntax checking and linting: [ESLint](http://eslint.org/)
* ESLint for Visual Studio Code: [ESLint for VSC](https://code.visualstudio.com/docs/languages/javascript)
* Config files in node.js: [node-config](https://github.com/lorenwest/node-config)
* Command line parameter parsing in node.js: [yargs](https://github.com/yargs/yargs)
* MkDocs for creating doc site: [MkDocs](http://www.mkdocs.org/)
* GitHub Pages (github.io) for hosting docs. Pushing docs to github.io: `mkdocs gh-deploy --clean`
* [node-windows](https://www.npmjs.com/package/node-windows) for auto-starting Butler after server reboot.  
  Autostarting node apps on Windows is tricky... node-windows makes it relatively easy though.

## Documentation
The main documentation is built using [MkDocs](http://www.mkdocs.org/).
From within the butler-docs folder, run ```mkdocs build --clean``` to generate the static documentation files in the site folder.
Or run ```mkdocs serve```, then go to [http://127.0.0.1:8000](http://127.0.0.1:8000) to view a live version of the documentation as you edit (and save) it.
