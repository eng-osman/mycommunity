import { ApiModelProperty } from '@nestjs/swagger';
import { BaseEntity } from '@shared/entities';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '.';
@Entity('user_contacts')
export class UserContacts extends BaseEntity {
  @ApiModelProperty()
  @ManyToOne(() => User, user => user.id)
  @JoinColumn()
  public user: User;

  @Column('mediumtext')
  @ApiModelProperty({ description: 'Contact Mobile Number' })
  public mobileNumber: string;

  @Column({ type: 'text', nullable: true, collation: 'utf8mb4_bin' })
  @ApiModelProperty()
  public contactName: string;

  @ApiModelProperty()
  @Column({ default: false })
  public isFavourite: boolean;
  @ApiModelProperty({ description: 'Is This Contact a current user ?' })
  @Column({ default: false })
  public isUser: boolean;
  @ApiModelProperty({ description: 'if this contact a current user, then this will be his id' })
  @Column({ default: null, nullable: true, name: 'contact_user_id', type: 'varchar' })
  public userId: string | null;
  @ApiModelProperty()
  @Column({ default: false })
  public isBlocked: boolean;
}
