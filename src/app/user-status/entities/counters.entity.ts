import { ApiModelProperty } from '@nestjs/swagger';
import { Column } from 'typeorm';

export class Counters {
  @Column({ default: 0, type: 'integer', unsigned: true })
  @ApiModelProperty()
  public likesCount: number;

  @Column({ default: 0, type: 'integer', unsigned: true })
  @ApiModelProperty()
  public dislikesCount: number;

  @Column({ default: 0, type: 'integer', unsigned: true })
  @ApiModelProperty()
  public sharedCount: number;

  @Column({ default: 0, type: 'integer', unsigned: true })
  @ApiModelProperty()
  public commentCount: number;

  @Column({ default: 0, type: 'integer', unsigned: true })
  @ApiModelProperty()
  public viewsCount: number;
}
