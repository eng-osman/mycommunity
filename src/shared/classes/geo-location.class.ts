import { parseLocation } from '@shared/utils';
import { isNil } from 'ramda';

export class GeoLocation {
  public static from(obj: string | { lat: number; long: number }) {
    if (typeof obj === 'string') {
      const [lat, long] = parseLocation(obj);
      if (isNil(lat) || isNil(long)) {
        throw new TypeError('Error While Parsing Location.');
      } else {
        return new GeoLocation(lat, long);
      }
    } else {
      return new GeoLocation(obj.lat, obj.long);
    }
  }

  private constructor(public readonly lat: number = 0, public readonly long: number) {}

  public toTubule(): [number, number] {
    return [this.lat, this.long];
  }

  public toString(): string {
    return `${this.lat},${this.long}`;
  }
}
