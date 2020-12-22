import { ApiModelProperty } from '@nestjs/swagger';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, ManyToOne } from 'typeorm';
import { FollowRequestStatus } from '../follow-request-status.enum';
import { User } from './user.entity';
@Entity('follow_request')
export class FollowRequest extends BaseEntity {
  @ManyToOne(() => User, user => user.id)
  @ApiModelProperty()
  public me: User;

  @ManyToOne(() => User, user => user.id)
  @ApiModelProperty()
  public other: User;

  @Column({ type: 'tinyint', default: FollowRequestStatus.PENDING })
  @ApiModelProperty({ description: 'request status', type: Number })
  public status: FollowRequestStatus;
}
