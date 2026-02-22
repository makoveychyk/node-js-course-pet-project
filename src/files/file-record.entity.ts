import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export enum FileStatus {
  PENDING = 'pending',
  READY = 'ready',
}

export enum FileVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export enum FileEntityType {
  USER_AVATAR = 'userAvatar',
}

@Entity('file_records')
@Index('IDX_file_records_owner_id', ['ownerId'])
@Index('IDX_file_records_entity', ['entityType', 'entityId'])
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ type: 'uuid', name: 'entity_id', nullable: true })
  entityId: string | null;

  @Column({ type: 'varchar', length: 64, name: 'entity_type' })
  entityType: FileEntityType;

  @Column({ type: 'varchar', length: 256 })
  bucket: string;

  @Column({ type: 'varchar', length: 512 })
  key: string;

  @Column({ type: 'varchar', length: 255, name: 'content_type' })
  contentType: string;

  @Column({ type: 'bigint', default: 0 })
  size: string;

  @Column({ type: 'enum', enum: FileStatus, default: FileStatus.PENDING })
  status: FileStatus;

  @Column({
    type: 'enum',
    enum: FileVisibility,
    default: FileVisibility.PRIVATE,
  })
  visibility: FileVisibility;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
