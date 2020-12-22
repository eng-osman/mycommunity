import { IsString, MaxLength } from 'class-validator';
export class CreateAdvertisementCategoryDTO {
  @IsString()
  @MaxLength(300)
  public readonly name: string;
  @IsString()
  @MaxLength(500)
  public readonly description: string;
}
