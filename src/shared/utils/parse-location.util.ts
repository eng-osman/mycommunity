type float = number;
const isNotNaN = (n: number) => !isNaN(n);
/**
 * Converts a string to a tuple (lat, long) location.
 * @param location a string that represints the location in "lat,long" format
 */
export const parseLocation = (location: string): [float, float] => {
  const parts = location
    .trim()
    .split(',')
    .map(parseFloat)
    .filter(isNotNaN);
  return [parts[0], parts[1]];
};
