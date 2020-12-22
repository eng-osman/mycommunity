import { ApiModelProperty } from '@nestjs/swagger';
import { Column, PrimaryGeneratedColumn } from 'typeorm';

export abstract class BaseEntity {
  @ApiModelProperty({
    required: false,
    readOnly: true,
    type: Number,
    description: 'Auto Generated Id',
  })
  @PrimaryGeneratedColumn()
  public readonly id: any;

  @ApiModelProperty({
    required: false,
    type: String,
    readOnly: true,
    description: 'Auto Generated Date',
  })
  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(0)',
    nullable: false,
    precision: 0,
  })
  public readonly createdAt: Date;

  @ApiModelProperty({
    required: false,
    type: String,
    readOnly: true,
    description: 'Auto Generated Date',
  })
  @Column({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP(0)',
    nullable: false,
    precision: 0,
  })
  public readonly updatedAt: Date;
}
