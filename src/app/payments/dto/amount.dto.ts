import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AmountDTO {
  @ApiModelProperty()
  @IsString()
  public currency: string;

  @ApiModelProperty()
  @IsString()
  public total: string;

  @ApiModelPropertyOptional()
  @IsOptional()
  public details?: {
    subtotal?: string;
    shipping?: string;
    tax?: string;
    handling_fee?: string;
    shipping_discout?: string;
    insurance?: string;
    gift_wrap?: string;
  };
}
