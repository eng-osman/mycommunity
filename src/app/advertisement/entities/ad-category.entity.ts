import { BaseEntity } from '@shared/entities';
import { Column, Entity, ManyToOne } from 'typeorm';
import { Advertisement } from './ad.entity';
@Entity('advertisement_categories')
export class AdvertisementCategory extends BaseEntity {
  @ManyToOne(() => Advertisement, ad => ad.categories)
  public advertisements;

  @Column({ length: 300, type: 'varchar' })
  public name: string;

  @Column({ type: 'longtext' })
  public description: string;

  @Column({ unique: true, type: 'varchar' })
  public slug: string;

  @Column({ type: 'tinyint', default: false })
  public isDeleted: boolean;
}
