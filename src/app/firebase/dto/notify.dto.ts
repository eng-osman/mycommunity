import { ApiModelProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsString } from 'class-validator';
export class NotifyDTO {
  @ApiModelProperty({
    description: 'userIds that will be notified',
    isArray: true,
    maxItems: 100,
    uniqueItems: true,
  })
  @IsArray()
  @ArrayMaxSize(100)
  @ArrayNotEmpty()
  @ArrayUnique()
  public readonly userIds: string[];

  @ApiModelProperty({
    description: 'the notification title',
  })
  @IsString()
  public readonly title: string;

  @ApiModelProperty({
    description: 'the notification body',
  })
  @IsString()
  public readonly body: string;
}
