import { ApiModelProperty } from '@nestjs/swagger';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { UserPrivacy } from '../privacy/user-privacy.enum';
import { User } from './user.entity';
@Entity('users_privacy')
export class UsersPrivacy extends BaseEntity {
  @ManyToOne(() => User, user => user.id)
  @JoinColumn()
  @ApiModelProperty()
  public me: User;

  @ManyToOne(() => User, user => user.id)
  @JoinColumn()
  @ApiModelProperty()
  public other: User;

  @Column({ type: 'tinyint', default: UserPrivacy.NONE })
  @ApiModelProperty({ description: 'the block type', type: Number })
  public type: UserPrivacy;
}
