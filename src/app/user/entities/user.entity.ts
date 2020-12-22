import { Advertisement } from '@app/advertisement/entities';
import { ProfileVerification } from '@app/profile-verification/entities';
import { UserTransaction } from '@app/user-transactions/entities';
import { ApiModelProperty } from '@nestjs/swagger';
import { BaseEntity } from '@shared/entities';
import { Role } from '@shared/enums';
import { IsString } from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  RelationCount,
} from 'typeorm';
import { Channel } from './channel.entity';
import { Profile } from './profile.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 50, nullable: false, collation: 'utf8mb4_bin' })
  public username: string;

  @Column({ type: 'varchar', nullable: false, select: false })
  public password: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  public deviceToken: string;

  @Column({ type: 'varchar', nullable: true, select: false })
  public macAddress: string;

  @ApiModelProperty()
  @IsString()
  @Column({ type: 'varchar', unique: false, nullable: false, collation: 'utf8mb4_bin' })
  public email: string;

  @Column({ default: false })
  public isMobileVerified: boolean;

  @Column({ type: 'varchar', unique: true })
  public mobileNumber: string;

  @OneToOne(() => Profile, profile => profile.user)
  @JoinColumn()
  public profile: Profile;

  @OneToMany(() => Advertisement, ad => ad.owner)
  public advertisements: Advertisement[];

  @OneToMany(() => UserTransaction, transaction => transaction.user)
  public transactions: UserTransaction[];

  @OneToMany(() => ProfileVerification, request => request.user)
  public verificationRequests: ProfileVerification[];

  @Column({ type: 'simple-array', default: null })
  public roles: Role[] = [];

  @OneToOne(() => Channel, channel => channel.owner)
  @JoinColumn()
  public channel: Channel;

  @ManyToMany(() => Channel)
  @JoinTable()
  public followingChannels: Channel[];

  @RelationCount((user: User) => user.followingChannels)
  public followingChannelsCount: number;

  @Column({ default: false })
  public isSystem: boolean;
}
