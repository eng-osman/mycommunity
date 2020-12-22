import { map, split, take } from 'ramda';
const dateRegex = /([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))/;
export const extractAge = (date: string) =>
  dateRegex.test(date)
    ? new Date().getUTCFullYear() - map(parseInt, take(1, split('-', date)))[0]
    : 0;
