import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../orders/order.entity';
import { FileRecord } from '../files/file-record.entity';

@Entity('users')
@Index('IDX_users_email_unique', ['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'password_hash',
    nullable: true,
    select: false,
  })
  passwordHash?: string | null;

  @Column({
    type: 'text',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  roles: string[];

  @Column({
    type: 'text',
    array: true,
    default: () => 'ARRAY[]::text[]',
  })
  scopes: string[];

  @Column({ type: 'uuid', name: 'avatar_file_id', nullable: true })
  avatarFileId: string | null;

  @ManyToOne(() => FileRecord, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'avatar_file_id' })
  avatarFile: FileRecord | null;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
