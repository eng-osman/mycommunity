import { ApiModelProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Max, Min } from 'class-validator';
import { CreateHelpDTO } from './create-help.dto';

export class UpdateHelpDTO implements Partial<CreateHelpDTO> {
  @ApiModelProperty({
    description: 'The Number of members that needs help',
    maximum: 10,
    minimum: 1,
  })
  @IsNumber({
    allowInfinity: false,
    allowNaN: false,
  })
  @IsPositive()
  @Min(1)
  @Max(10)
  public readonly membersCount?: number;
}
