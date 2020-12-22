import { ApiModelProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
export class TopicSubscriptionDTO {
  @ApiModelProperty({ description: 'entityId maybe a userId or a statusId' })
  @IsString()
  public readonly entityId: string;
  @IsString()
  @IsIn(['status', 'user'])
  @ApiModelProperty({ description: 'the entity type, one of [status, user]' })
  public readonly type: string;
}
