import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PaymentState } from '../payment-state.enum';
import { TransactionDTO } from './transaction.dto';

export class PaymentDTO {
  @ApiModelPropertyOptional()
  @IsString()
  @IsOptional()
  public intent?: string;

  @ApiModelProperty({ isArray: true, type: TransactionDTO })
  @ValidateNested()
  @IsArray()
  public transactions: TransactionDTO[];

  @ApiModelProperty({ enum: PaymentState })
  @IsEnum(PaymentState)
  public readonly state: PaymentState;
}
