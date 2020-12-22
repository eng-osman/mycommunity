import { ApiModelProperty } from '@nestjs/swagger';
import { IsString, ValidateNested } from 'class-validator';
import { PaymentDTO } from './payment.dto';

export class VerifyPaymentDTO {
  @ApiModelProperty()
  @IsString()
  public paymentId: string;

  @ApiModelProperty({ type: PaymentDTO })
  @ValidateNested()
  public clientPayment: PaymentDTO;
}
