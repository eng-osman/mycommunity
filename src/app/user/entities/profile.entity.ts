import { ApiModelProperty } from '@nestjs/swagger';
import { Contains, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { Column, Entity, OneToOne } from 'typeorm';

import { BaseEntity } from '@shared/entities';
import { User } from './user.entity';

@Entity('profiles')
export class Profile extends BaseEntity {
  @ApiModelProperty()
  @MaxLength(35)
  @IsString()
  @Column({ type: 'varchar', length: 35, nullable: false, collation: 'utf8mb4_bin' })
  public firstName: string;

  @ApiModelProperty()
  @MaxLength(35)
  @IsString()
  @Column({ type: 'varchar', length: 35, nullable: false, collation: 'utf8mb4_bin' })
  public lastName: string;

  @ApiModelProperty({ required: false })
  @MaxLength(35)
  @IsString()
  @IsOptional()
  @Column({ type: 'varchar', length: 35, nullable: true, collation: 'utf8mb4_bin', default: '' })
  public nickName: string;

  @ApiModelProperty({ default: 'en' })
  @IsString()
  @MaxLength(5)
  @IsOptional()
  @Column({ type: 'varchar', length: 5, nullable: false, default: 'en' })
  public language: string;

  @ApiModelProperty({
    required: false,
    description: 'The User Location in "Lat,Long" form. eg: "25.790000,30.698929" ',
  })
  @IsString()
  @IsOptional()
  @Column({ type: 'varchar', nullable: true })
  public location: string;

  @ApiModelProperty({ required: false })
  @IsString()
  @IsOptional()
  @Column({
    type: 'varchar',
    length: 300,
    default: 'Egypt',
  })
  public country: string;

  @ApiModelProperty({ required: false })
  @IsString()
  @IsOptional()
  @Column({ type: 'varchar', length: 6, default: 'EG' })
  public countryCode: string;

  @ApiModelProperty({ required: false })
  @IsString()
  @MaxLength(6)
  @IsOptional()
  @Column({ type: 'varchar', length: 6, default: '+20' })
  public countryDialCode: string;

  @ApiModelProperty({ default: 'male', in: 'male, female, others' })
  @IsString()
  @IsIn(['male', 'female', 'others'])
  @IsOptional()
  @Column({
    type: 'varchar',
    length: 6,
    nullable: false,
    default: 'male',
  })
  public gender: 'male' | 'female' | 'others';

  @ApiModelProperty({ required: true, description: 'a Date Fromat YYYY-MM-DD' })
  @IsString()
  @IsOptional()
  @Column({ type: 'date', nullable: true, default: '2000-01-01' })
  public birthdate: string;

  @ApiModelProperty({ required: false, description: 'max length 140 char.' })
  @IsString()
  @MaxLength(140)
  @IsOptional()
  @Column({ type: 'longtext', nullable: true, collation: 'utf8mb4_bin', default: '' })
  public description: string;

  @ApiModelProperty({ required: false })
  @IsString()
  @IsOptional()
  @Column({ type: 'text', nullable: true, default: '', collation: 'utf8mb4_bin' })
  public education: string;

  @ApiModelProperty({ required: false })
  @IsString()
  @IsOptional()
  @Column({ type: 'text', nullable: true, collation: 'utf8mb4_bin', default: '' })
  public jobTitle: string;

  @ApiModelProperty({ required: false })
  @IsString()
  @Contains('facebook.com')
  @IsOptional()
  @Column({ type: 'text', nullable: true, default: '' })
  public facebookLink: string;

  @Column({ default: false })
  public verified: boolean;

  @Column({ default: false })
  public isActive: boolean;

  @Column({ type: 'date', nullable: true })
  public lastLogin: Date;

  @OneToOne(() => User)
  public user: User;

  @Column({ type: 'text', nullable: true, default: '' })
  public profileImage: string;
}
