import { UserMedia } from '@app/media/entities';
import { Media } from '@app/media/media.interface';
import { User } from '@app/user/entities';
import { Channel } from '@app/user/entities/channel.entity';
import { ApiModelProperty } from '@nestjs/swagger';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { StatusPrivacy } from '../status-privacy.enum';
import { Counters } from './counters.entity';

@Entity('user_status')
export class Status extends BaseEntity {
  @PrimaryGeneratedColumn()
  public id: any;
  @ApiModelProperty()
  @ManyToOne(() => User, user => user.id)
  @JoinColumn()
  public user: User;

  @Column({ type: 'longtext', default: '', collation: 'utf8mb4_bin' })
  @ApiModelProperty()
  public text: string;

  @ApiModelProperty({ type: Object, description: 'The main status' })
  @ManyToOne(() => Status, status => status.replies)
  public parent: Status;

  @ApiModelProperty({
    isArray: true,
    type: Object,
    description: 'array of statuses as replies on main status',
  })
  @OneToMany(() => Status, status => status.parent)
  public replies: Status[];

  @ApiModelProperty({
    type: Object,
    description: 'the original status where this status shared from',
  })
  @ManyToOne(() => Status)
  public originalStatus: Status;

  @Column({ default: false })
  @ApiModelProperty()
  public hideOriginalStatusOwner: boolean;

  @Column({ type: 'double', nullable: true })
  @ApiModelProperty()
  public stars: number;

  @Column({ type: 'text', nullable: true, collation: 'utf8mb4_bin' })
  @ApiModelProperty()
  public locationName: string;

  @Column({ nullable: true, collation: 'utf8mb4_bin' })
  @ApiModelProperty()
  public coordinates: string;

  @Column({ default: false })
  @ApiModelProperty()
  public hasMedia: boolean;

  @Column({ default: false })
  @ApiModelProperty()
  public hasPrivacy: boolean;

  @Column({ default: false })
  @ApiModelProperty()
  public isShare: boolean;

  @Column({ default: false })
  @ApiModelProperty()
  public isPublicGlobal: boolean;

  @Column({ default: false })
  @ApiModelProperty()
  public isReply: boolean;

  @Column({ default: false })
  @ApiModelProperty()
  public isLive: boolean;

  @Column({ type: 'varchar', nullable: true })
  @ApiModelProperty()
  public liveVideoChannelId: string;

  @ManyToOne(() => Channel, channel => channel.channelMedia)
  @ApiModelProperty()
  public channel: Channel;

  @Column({ type: 'varchar', default: 'public', nullable: false })
  @ApiModelProperty()
  public privacy: StatusPrivacy;

  @ApiModelProperty({ type: Array<UserMedia>() })
  @Column({ type: 'json', nullable: true, default: '[]' })
  public media: Media[];

  @ApiModelProperty()
  @Column({ type: 'json', nullable: true, default: '[]' })
  public contactsToshow?: string[];

  @Column({ type: 'simple-array', nullable: true, default: '' })
  public mediaHashs: string[];

  @ApiModelProperty({ type: Array<string>() })
  @Column({ type: 'json', nullable: true })
  public mentions: string[] | Array<{ id: string; fullName: string }>;

  @ApiModelProperty()
  @Column({ nullable: false, default: 'status' })
  public type: 'story' | 'media' | 'status' | 'channelMedia' | 'rate' | 'help' | 'competition';

  @ApiModelProperty()
  @Column({ nullable: true })
  public withUserId: string;

  @ApiModelProperty()
  @Column({ nullable: true })
  public local_id?: string;

  @Column({ nullable: false, default: false, type: 'tinyint' })
  public deleted: boolean;

  @ApiModelProperty({ required: false, type: Counters })
  @Column(() => Counters)
  public counters: Counters;

  public currentUserAction: {
    isView: boolean;
    isLike: boolean;
    isDislike: boolean;
  };
}
