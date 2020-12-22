import { ApiModelProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateReportDTO {
  @ApiModelProperty()
  @IsString()
  public readonly entityId: string;

  @ApiModelProperty({
    description: 'one of [user, status]',
  })
  @IsString()
  @IsIn(['user', 'status'])
  public readonly entityType: 'user' | 'status';

  @ApiModelProperty()
  @IsString()
  @MaxLength(600)
  public readonly reason: string;
}
