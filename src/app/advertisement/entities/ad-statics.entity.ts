import { BaseEntity } from '@shared/entities';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Advertisement } from './ad.entity';

@Entity('advertisement_statics')
export class AdvertisementStatics extends BaseEntity {
  @ManyToOne(() => Advertisement, ad => ad.statics)
  public advertisement: Advertisement;
  // Do we need to use a `bigint` ? idk
  @Column({ type: 'int', unsigned: true, default: 0 })
  public positiveViews: number = 0;

  @Column({ type: 'int', unsigned: true, default: 0 })
  public negativeViews: number = 0;

  @Column({ type: 'int', unsigned: true, default: 0 })
  public clicks: number = 0;

  @Column({ type: 'int', unsigned: true, default: 0 })
  public males: number = 0;

  @Column({ type: 'int', unsigned: true, default: 0 })
  public females: number = 0;

  @Column({ type: 'int', unsigned: true, default: 0 })
  public ageRangeFrom: number = 0;

  @Column({ type: 'int', unsigned: true, default: 0 })
  public ageRangeTo: number = 0;

  @Column({ type: 'simple-array', nullable: true })
  public countries: null | string[];
}
