// Function to check if a given directory (child) is a subdirectory of 
// another directory (parent).
//
// This function assumes that both child and parent are normalized paths 
// (i.e., they don't contain . or .. segments), and that they use 
// forward slashes (/) as path separators.
const isDirectoryChildOf = (child, parent) => {
    if (child === parent) return true;

    const parentTokens = parent.split('/').filter((i) => i.length);

    return parentTokens.every((t, i) => child.split('/').filter((i) => i.length)[i] === t);
};

module.exports = {
    isDirectoryChildOf,
};
