/**
 * Task Execution Details Sort utility module.
 *
 * This module provides a shared comparison function for sorting task execution details
 * in chronological order. Used across multiple task execution result modules
 * (reload, external program, user sync, distribute).
 */

/**
 * Compares two task detail objects based on their creation date.
 * Used for sorting task execution details in chronological order.
 * @param {Object} a - The first task detail object.
 * @param {string} a.detailCreatedDate - The creation date of the first task detail.
 * @param {Object} b - The second task detail object.
 * @param {string} b.detailCreatedDate - The creation date of the second task detail.
 * @returns {number} - Returns -1 if a is earlier than b, 1 if a is later than b, and 0 if they are equal.
 */
export function compareTaskDetails(a, b) {
    if (a.detailCreatedDate < b.detailCreatedDate) {
        return -1;
    }
    if (a.detailCreatedDate > b.detailCreatedDate) {
        return 1;
    }
    return 0;
}

export default compareTaskDetails;
