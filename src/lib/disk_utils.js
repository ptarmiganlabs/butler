/**
 * Check if a given directory (child) is a subdirectory of another directory (parent).
 * This function assumes that both child and parent are normalized paths
 * (i.e., they don't contain . or .. segments), and that they use forward slashes (/) as path separators.
 * @param {string} child - The child directory path.
 * @param {string} parent - The parent directory path.
 * @returns {boolean} - True if the child is a subdirectory of the parent, false otherwise.
 */
const isDirectoryChildOf = (child, parent) => {
    if (child === parent) return true;

    const parentTokens = parent.split('/').filter((i) => i.length);

    return parentTokens.every((t, i) => child.split('/').filter((j) => j.length)[i] === t);
};

export default isDirectoryChildOf;
