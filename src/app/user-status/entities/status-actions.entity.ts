import { User } from '@app/user/entities';
import { ApiModelProperty } from '@nestjs/swagger';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { StatusAction } from '../status-actions.enum';
import { Status } from './status.entity';
@Entity('user_status_actions')
export class StatusActions extends BaseEntity {
  @ApiModelProperty({ type: User })
  @ManyToOne(() => User, user => user.id)
  @JoinColumn()
  public user: User;

  @ApiModelProperty({ type: Status })
  @ManyToOne(() => Status, status => status.id)
  @JoinColumn()
  public status: Status;

  @ApiModelProperty({ type: Number })
  @Column({ type: 'tinyint' })
  public type: StatusAction;

  public statusId?: string;
}
