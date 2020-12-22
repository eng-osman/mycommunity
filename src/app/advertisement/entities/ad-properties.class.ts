import { Column } from 'typeorm';

export class AdvertisementProperties {
  @Column({ type: 'varchar' })
  public targetCountry: string;

  @Column({ type: 'simple-json' })
  public targetLocation: { lat: number; long: number };

  @Column({ type: 'int', unsigned: true, default: 0 })
  public targetAgeRangeFrom: number = 0;

  @Column({ type: 'int', unsigned: true, default: 0 })
  public targetAgeRangeTo: number = 0;

  @Column({ type: 'int', unsigned: true, default: 0 })
  public targetGeoRange: number;

  @Column({ type: 'enum', enum: ['male', 'female', 'all'] })
  public targetGender: 'male' | 'female' | 'all';
}
