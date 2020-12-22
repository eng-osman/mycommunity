import { BaseEntity } from '@shared/entities';
import { Column, Entity } from 'typeorm';

type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;

@Entity('application_settings')
export class ApplicationSettings extends BaseEntity {
  @Column({ type: 'decimal', precision: 16, scale: 2, nullable: false, default: 1.0 })
  public pointsFactor: number;

  @Column({ type: 'int', nullable: false, default: 5 })
  public clickPrice: number;

  @Column({ type: 'int', nullable: false, default: 1 })
  public viewPrice: number;

  @Column({ type: 'varchar', nullable: true, default: '<p>TOS</p>' })
  public competitionTOS: string;

  @Column({ type: 'varchar', nullable: true, default: '<p>Prizes</p>' })
  public competitionPrizes: string;

  @Column({
    type: 'smallint',
    nullable: false,
    default: 6,
    precision: 0,
  })
  public competitionVoteStartDay: Day;

  @Column({
    type: 'smallint',
    nullable: false,
    default: 5,
    precision: 0,
  })
  public competitionVoteEndDay: Day;
}
