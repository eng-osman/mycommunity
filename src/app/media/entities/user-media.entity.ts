import { User } from '@app/user/entities';
import { ApiModelProperty } from '@nestjs/swagger';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Media } from '../media.interface';

@Entity('users_media')
export class UserMedia extends BaseEntity implements Media {
  @ApiModelProperty()
  @Column({ unique: true })
  public url: string;
  @ApiModelProperty()
  @Column({ default: 'photo' })
  public type: 'photo' | 'voice' | 'video' | 'files';
  @ApiModelProperty()
  @Column()
  public size: number;
  @ApiModelProperty()
  @Column()
  public mimetype: string;
  @ApiModelProperty({ description: 'Video Duration on this format mm:ss' })
  @Column({ default: '00:00' })
  public duration: string;
  @ApiModelProperty()
  @Column({ type: 'simple-array', nullable: true })
  public thumbnails: string[];
  @ApiModelProperty()
  @Column({ default: null, type: 'varchar' })
  public conversationId: string | null;
  @ApiModelProperty()
  @Column({ default: '', type: 'varchar' })
  public mediaHash: string;
  @ApiModelProperty()
  @ManyToOne(() => User, user => user.id)
  @JoinColumn()
  public user: User;
}
