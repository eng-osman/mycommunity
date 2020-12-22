import { aperture, filter, map, split, take, trim } from 'ramda';
const isNotNaN = n => !isNaN(n);
/**
 * Converts a string to a tuple (from, to) range.
 * @param range a string that represints the range in "from:to" format
 */
export const parseRange = (range: string): [number, number] =>
  aperture<number>(
    2,
    filter<number>(isNotNaN, map(parseInt, map(trim, take(2, split(':', range))))),
  )[0];

/**
 *
 * @param age a number that represints the user age
 * @param ranges a string array that contains the range in "from:to" format
 */
export const getAgeRange = (age: number, ranges: string[]): [number, number] => {
  for (const range of ranges) {
    const [from, to] = parseRange(range);
    if (age >= from && age <= to) {
      return [from, to];
    }
  }
  return [-1, -1];
};
