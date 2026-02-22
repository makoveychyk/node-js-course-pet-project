import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  FileEntityType,
  FileRecord,
  FileStatus,
  FileVisibility,
} from './file-record.entity';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AuthUser } from '../auth/types';

export type CreatePresignedUploadInput = {
  entityType: FileEntityType;
  contentType: string;
  size?: number;
  visibility?: FileVisibility;
  entityId?: string;
};

export type CreatePresignedUploadResult = {
  fileId: string;
  key: string;
  uploadUrl: string;
  contentType: string;
  expiresIn: number;
};

export type CompleteUploadResult = {
  fileId: string;
  status: FileStatus;
  url: string;
};

export type FileMetadataResult = {
  id: string;
  key: string;
  bucket: string;
  status: FileStatus;
  contentType: string;
  visibility: FileVisibility;
  size: string;
  url?: string;
};

@Injectable()
export class FilesService {
  private readonly bucket: string;
  private readonly region: string;
  private readonly presignTtlSeconds: number;
  private readonly cloudfrontBaseUrl?: string;
  private readonly s3Client: S3Client;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
    @InjectRepository(FileRecord)
    private readonly fileRecordsRepository: Repository<FileRecord>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    this.region = this.configService.getOrThrow<string>('AWS_REGION');
    this.cloudfrontBaseUrl =
      this.configService.get<string>('CLOUDFRONT_BASE_URL') ?? undefined;
    this.presignTtlSeconds = Number(
      this.configService.get<string>('FILES_PRESIGN_EXPIRES_IN_SEC') ?? 900,
    );

    this.s3Client = new S3Client({ region: this.region });
  }

  async createPresignedUpload(
    user: AuthUser,
    input: CreatePresignedUploadInput,
  ): Promise<CreatePresignedUploadResult> {
    const owner = await this.usersService.assertExists(user.sub);
    const targetEntityId = input.entityId ?? owner.id;

    this.assertEntityAccess(input.entityType, owner.id, targetEntityId);

    if (!input.contentType || !input.contentType.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }

    if (input.size && input.size <= 0) {
      throw new BadRequestException('File size must be positive');
    }

    if (
      input.visibility &&
      !this.isVisibilityAllowed(input.entityType, input.visibility)
    ) {
      throw new BadRequestException('Visibility is not allowed for entity');
    }

    const visibility =
      input.visibility ?? this.defaultVisibilityForEntity(input.entityType);

    const key = this.buildStorageKey(
      input.entityType,
      targetEntityId,
      input.contentType,
    );

    const record = this.fileRecordsRepository.create({
      ownerId: owner.id,
      bucket: this.bucket,
      key,
      contentType: input.contentType,
      size: input.size ? String(input.size) : '0',
      status: FileStatus.PENDING,
      visibility,
      entityType: input.entityType,
      entityId: targetEntityId,
    });

    await this.fileRecordsRepository.save(record);

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: record.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: this.presignTtlSeconds,
    });

    return {
      fileId: record.id,
      key: record.key,
      uploadUrl,
      contentType: record.contentType,
      expiresIn: this.presignTtlSeconds,
    };
  }

  async completeUpload(
    fileId: string,
    user: AuthUser,
  ): Promise<CompleteUploadResult> {
    if (!fileId) {
      throw new BadRequestException('fileId is required');
    }

    const result = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(FileRecord);
      const file = await repo.findOne({
        where: { id: fileId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!file) {
        throw new NotFoundException('File not found');
      }

      if (file.ownerId !== user.sub) {
        throw new ForbiddenException('You cannot complete someone else\'s file');
      }

      if (file.status !== FileStatus.PENDING) {
        throw new ConflictException('File already completed');
      }

      if (
        file.entityType === FileEntityType.USER_AVATAR &&
        file.entityId !== user.sub
      ) {
        throw new ForbiddenException('Cannot complete avatar for another user');
      }

      file.status = FileStatus.READY;
      await repo.save(file);

      await this.attachFileToEntity(manager.getRepository(User), file);

      return file;
    });

    return {
      fileId: result.id,
      status: result.status,
      url: this.buildFileUrl(result),
    };
  }

  async getFileForUser(
    fileId: string,
    user: AuthUser,
  ): Promise<FileMetadataResult> {
    const file = await this.fileRecordsRepository.findOne({ where: { id: fileId } });
    if (!file) {
      throw new NotFoundException('File not found');
    }

    if (file.ownerId !== user.sub) {
      throw new ForbiddenException('You cannot access this file');
    }

    return {
      id: file.id,
      key: file.key,
      bucket: file.bucket,
      status: file.status,
      contentType: file.contentType,
      visibility: file.visibility,
      size: file.size,
      url: file.status === FileStatus.READY ? this.buildFileUrl(file) : undefined,
    };
  }

  private assertEntityAccess(
    entityType: FileEntityType,
    ownerId: string,
    entityId: string,
  ) {
    switch (entityType) {
      case FileEntityType.USER_AVATAR:
        if (ownerId !== entityId) {
          throw new ForbiddenException('Cannot upload avatar for another user');
        }
        break;
      default:
        throw new BadRequestException('Unsupported entity type');
    }
  }

  private buildStorageKey(
    entityType: FileEntityType,
    entityId: string,
    contentType: string,
  ): string {
    const extension = this.resolveExtension(contentType);

    switch (entityType) {
      case FileEntityType.USER_AVATAR:
        return `users/${entityId}/avatars/${randomUUID()}.${extension}`;
      default:
        throw new BadRequestException('Unsupported entity type');
    }
  }

  private resolveExtension(contentType: string): string {
    switch (contentType) {
      case 'image/jpeg':
        return 'jpg';
      case 'image/png':
        return 'png';
      case 'image/webp':
        return 'webp';
      default:
        if (contentType.startsWith('image/')) {
          return contentType.split('/').at(1) ?? 'bin';
        }
        return 'bin';
    }
  }

  private buildFileUrl(file: FileRecord): string {
    const normalizedKey = file.key.replace(/^\//, '');

    if (this.cloudfrontBaseUrl) {
      return `${this.cloudfrontBaseUrl.replace(/\/$/, '')}/${normalizedKey}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${normalizedKey}`;
  }

  private async attachFileToEntity(
    usersRepo: Repository<User>,
    file: FileRecord,
  ): Promise<void> {
    if (file.entityType === FileEntityType.USER_AVATAR) {
      if (!file.entityId) {
        throw new BadRequestException('File is not linked to user');
      }

      await usersRepo.update(file.entityId, { avatarFileId: file.id });
    } else {
      throw new BadRequestException('Unsupported entity type');
    }
  }

  private defaultVisibilityForEntity(
    entityType: FileEntityType,
  ): FileVisibility {
    switch (entityType) {
      case FileEntityType.USER_AVATAR:
        return FileVisibility.PRIVATE;
      default:
        return FileVisibility.PRIVATE;
    }
  }

  private isVisibilityAllowed(
    entityType: FileEntityType,
    visibility: FileVisibility,
  ): boolean {
    if (entityType === FileEntityType.USER_AVATAR) {
      return visibility === FileVisibility.PRIVATE;
    }

    return true;
  }
}
