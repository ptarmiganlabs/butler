/*eslint strict: ["error", "global"]*/
/*eslint no-invalid-this: "error"*/

'use strict';

const isDirectoryChildOf = (child, parent) => {
    if (child === parent) return true;

    const parentTokens = parent.split('/').filter(i => i.length);
    
    return parentTokens.every((t, i) => child.split('/')[i] === t);
};

module.exports = {
    isDirectoryChildOf,
};
