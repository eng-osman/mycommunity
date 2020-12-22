import { User } from '@app/user/entities';
import { ApiModelProperty } from '@nestjs/swagger';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, ManyToOne } from 'typeorm';
import { VerificationStatus } from '../verification-status.enum';
import { VerificationType } from '../verification-type.enum';

@Entity('profile_verification')
export class ProfileVerification extends BaseEntity {
  @ApiModelProperty()
  @ManyToOne(() => User, user => user.verificationRequests)
  public user: User;

  @ApiModelProperty({ enum: VerificationStatus })
  @Column({ type: 'enum', enum: VerificationStatus })
  public status: VerificationStatus;

  @ApiModelProperty({ enum: VerificationType })
  @Column({ type: 'enum', enum: VerificationType })
  public type: VerificationType;

  @ApiModelProperty()
  @Column()
  public media: string;

  @ApiModelProperty({ default: '' })
  @Column({ type: 'varchar', nullable: false, default: '', collation: 'utf8mb4_bin' })
  public message: string;
}
