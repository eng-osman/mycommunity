import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
export class StoreNotificationDTO {
  @ApiModelPropertyOptional({ description: 'the author of the action/status' })
  @IsString()
  @IsOptional()
  public senderId: string;
  @ApiModelPropertyOptional()
  @IsString()
  @IsOptional()
  public statusId: string;
  @ApiModelPropertyOptional()
  @IsString()
  @IsOptional()
  public statusOwner: string;
  @ApiModelPropertyOptional({
    description: 'used in live video notifications',
  })
  @IsString()
  @IsOptional()
  public channelId: string;
  @ApiModelPropertyOptional()
  @IsString()
  @IsOptional()
  public statusType: string;
  @ApiModelPropertyOptional()
  @IsString()
  @IsOptional()
  public actionType: string;
  @ApiModelProperty({ required: true })
  @IsString()
  public notificationType: string;
  @ApiModelPropertyOptional()
  @IsString()
  @IsOptional()
  public senderProfilePic: string;

  public userId: string;
}
