import { ApiModelProperty, ApiModelPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { AmountDTO } from './amount.dto';

export class TransactionDTO {
  @ApiModelProperty({ type: AmountDTO })
  @ValidateNested()
  public amount: AmountDTO;

  @ApiModelPropertyOptional()
  @IsString()
  @IsOptional()
  public description?: string;

  @ApiModelPropertyOptional()
  @IsString()
  @IsOptional()
  // tslint:disable-next-line:variable-name
  public invoice_number?: string;
}
