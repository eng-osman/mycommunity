import { ApiModelProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UserMacAdressDTO {
  @ApiModelProperty({ description: 'the user mac adress' })
  @IsString()
  public readonly macAdress: string;
}
