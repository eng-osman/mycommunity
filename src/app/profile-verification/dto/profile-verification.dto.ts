import { ApiModelProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class ProfileVerificationDTO {
  @ApiModelProperty({
    in: 'company, publicFiguare',
  })
  @IsString()
  @IsIn(['company', 'publicFiguare'])
  public readonly type: 'company' | 'publicFiguare';
  @ApiModelProperty()
  @IsString()
  public readonly mediaId: string;
}
