import { flatten, pipe, zip } from 'ramda';

export const isUndefined = (obj: any): obj is undefined => typeof obj === 'undefined';
export const isObject = (fn: any): fn is object => typeof fn === 'object';
export const isString = (fn: any): fn is string => typeof fn === 'string';
export const isEmpty = (array: string | any[]): boolean => !(array && array.length > 0);
export const zipFlatten = (arr1: any[], arr2: any[]): any[] =>
  (pipe(
    zip,
    flatten as any,
  ) as any)(arr1, arr2);
export const toTimestamp = (date: string) => Date.parse(date) || Date.now();

export const standardizeMobileNumber = (mob: string) => mob.replace(/\+/g, '');

export const snooze = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Returns `true` if and only if one of `x`, `y` or `z` is `true`, otherwise `false`.
 */
export const iff = (x: boolean = false, y: boolean = false, z: boolean = false) =>
  (!x && !y && z) || (!x && y && !z) || (x && !y && !z);

const days = ['Sat' , 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
export const dayStrToNumber = (
  day: 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat',
): number => days.indexOf(day);

export const dayNumToStr = (day: 0 | 1 | 2 | 3 | 4 | 5 | 6) => days[day];
