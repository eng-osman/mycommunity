import { isNil } from 'ramda';

/**
 * Helpers.
 */

const s = 1000;
const m = s * 60;
const h = m * 60;
const d = h * 24;
const w = d * 7;
const y = d * 365.25;

/**
 * returns the time given in seconds
 *
 * @param {String} val
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {Number}
 */

export const time = (val: string): number => {
  const type = typeof val;
  if (type === 'string' && val.length > 0 && !isNil(val)) {
    const parsed = parse(val);
    if (!isNil(parsed)) {
      return Math.round(parsed / 1000);
    } else {
      throw new Error('Error While Parseing Value to Time');
    }
  } else {
    throw new Error(`val is not a non-empty string or a valid number. val=${JSON.stringify(val)}`);
  }
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str: string): number | undefined {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  // tslint:disable-next-line:max-line-length
  const match = /^((?:\d+)?\-?\d?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str,
  );
  if (!match) {
    return;
  }
  const n = parseFloat(match[1]);
  const type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}
