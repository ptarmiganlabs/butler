# Tools used to create Butler
Below follows a (most likely non complete) list of tools that were used to create Butler.  
It is intended to serve as a reminder to self for how to carry out various tasks, some of which may only be occasionally used.
Thus, please treat this page for what it is...


* Syntax checking and linting: [ESLint](http://eslint.org/)
* Linter for Atom editor: [Linter](https://github.com/steelbrain/linter)
* Seamless integration of ESLine into Atom, via Linter: [Linter-ESLint](https://atom.io/packages/linter-eslint)   
* Config files in node.js: [node-config](https://github.com/lorenwest/node-config)
* Command line parameter parsing in node.js: [yargs](https://github.com/yargs/yargs)
* MkDocs for creating doc site: [MkDocs](http://www.mkdocs.org/)
* GitHub Pages (github.io) for hosting docs. Pushing docs to github.io: `mkdocs gh-deploy --clean`
* [node-windows](https://www.npmjs.com/package/node-windows) for auto-starting Butler after server reboot.

## Documentation

### MkDocs
The main documentation is built using [MkDocs](http://www.mkdocs.org/).
From within the butler-docs folder, run ```mkdocs build --clean``` to generate the static documentation files in the site folder.
Or run ```mkdocs serve```, then go to [http://127.0.0.1:8000](http://127.0.0.1:8000) to view a live version of the documentation as you edit (and save) it.
