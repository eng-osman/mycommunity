import { Status } from '@app/user-status/entities';
import { ApiModelProperty } from '@nestjs/swagger';
import { BaseEntity } from '@shared/entities';
import { IsString, MaxLength } from 'class-validator';
import { Column, Entity, JoinTable, ManyToMany, OneToMany, OneToOne, RelationCount } from 'typeorm';
import { User } from './user.entity';

@Entity('user_channels')
export class Channel extends BaseEntity {
  @ApiModelProperty()
  @MaxLength(35)
  @IsString()
  @Column({ type: 'varchar', length: 35, nullable: false, collation: 'utf8mb4_bin' })
  public channelName: string;

  @OneToOne(() => User, user => user.channel)
  public owner: User;

  @Column({ type: 'text', nullable: true, default: '' })
  public profileImage?: string;

  @Column({ type: 'text', nullable: true, default: '', collation: 'utf8mb4_bin' })
  @ApiModelProperty({ description: 'describtion about the Channel', type: String })
  public describtion?: string;

  @Column({ default: true })
  @ApiModelProperty()
  public isPublicGlobal: boolean;

  @Column({ nullable: true, collation: 'utf8mb4_bin' })
  @ApiModelProperty()
  public coordinates?: string;

  @Column({ type: 'text', nullable: true, default: '' })
  public thumbnail?: string;

  @OneToMany(() => Status, status => status.channel)
  public channelMedia: Status[];

  @RelationCount((channel: Channel) => channel.followers)
  public followersCount: number;

  @ManyToMany(() => User, user => user.followingChannels)
  @JoinTable()
  public followers: User[];
  // @Column({ default: false })
  // @ApiModelProperty()
  // public isGroupChannel: boolean;

  // @ApiModelProperty()s
  // @Column({ type: 'json', nullable: true })
  // public groupChannelMembers?: string[];

  // @Column({ default: false })
  // public verified: boolean;

  // @Column({ default: false })
  // public isActive: boolean;
}
