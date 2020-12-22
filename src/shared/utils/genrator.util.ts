import nanoid = require('nanoid');
/**
 * Generate an Unique Id
 *
 * @param {Number} length  The number of chars of the uid
 * @returns {String} the unique id
 */

export const generateUnique = (length: number): string => {
  return nanoid(length);
};
