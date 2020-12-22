import { User } from '@app/user/entities';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { AdvertisementCategory } from './ad-category.entity';
import { AdvertisementProperties } from './ad-properties.class';
import { AdvertisementStatics } from './ad-statics.entity';

@Entity('advertisements')
export class Advertisement extends BaseEntity {
  @ManyToOne(() => User, user => user.advertisements)
  public owner: User;

  @OneToMany(() => AdvertisementStatics, statics => statics.advertisement)
  public statics: AdvertisementStatics[];

  @OneToMany(() => AdvertisementCategory, category => category.advertisements)
  public categories: AdvertisementCategory[];

  @Column({ type: 'enum', enum: ['photo', 'video'] })
  public type: 'photo' | 'video';

  @Column({ type: 'simple-json' })
  public size: { width: number; height: number };

  @Column({ type: 'longtext', nullable: true, collation: 'utf8mb4_bin' })
  public text?: string;

  @Column({ type: 'longtext', nullable: true, collation: 'utf8mb4_bin' })
  public url?: string;

  @Column({ type: 'text', nullable: true, default: null })
  public mediaUrl: string | null = null;

  @Column(() => AdvertisementProperties, { prefix: 'ad_' })
  public properties: AdvertisementProperties;

  @Column({ unique: true })
  public slug: string;

  @Column({ default: '' })
  public destinationURL: string;

  @Column({ type: 'int', nullable: false, default: 0 })
  public expiresInDays: number;

  @Column({ type: 'datetime', nullable: true, default: null })
  public expiresAt: Date | null;

  @Column({ type: 'tinyint', default: false })
  public isActive: boolean = false;

  @Column({ type: 'int', unsigned: false, nullable: false, default: 0 })
  public points: number;
}
