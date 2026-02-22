import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Scopes } from '../auth/scopes.decorator';
import { ScopesGuard } from '../auth/scopes.guard';
import type { AuthUser } from '../auth/types';
import { FilesService } from './files.service';
import { FileEntityType, FileVisibility } from './file-record.entity';

@UseGuards(JwtAuthGuard, ScopesGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('presign')
  @Scopes('files:write')
  async createPresignedUpload(
    @Req() req: Request & { user?: AuthUser },
    @Body()
    body?: {
      entityType?: FileEntityType;
      contentType?: string;
      size?: number;
      visibility?: FileVisibility;
      entityId?: string;
    },
  ) {
    if (!body?.entityType) {
      throw new BadRequestException('entityType is required');
    }

    if (!Object.values(FileEntityType).includes(body.entityType)) {
      throw new BadRequestException('Unsupported entityType');
    }

    if (!body.contentType) {
      throw new BadRequestException('contentType is required');
    }

    const size =
      body.size === undefined || body.size === null
        ? undefined
        : Number(body.size);

    if (size !== undefined && !Number.isFinite(size)) {
      throw new BadRequestException('size must be a number');
    }

    if (
      body.visibility &&
      !Object.values(FileVisibility).includes(body.visibility)
    ) {
      throw new BadRequestException('Invalid visibility');
    }

    return this.filesService.createPresignedUpload(
      req.user as AuthUser,
      {
        entityType: body.entityType,
        contentType: body.contentType,
        size,
        visibility: body.visibility,
        entityId: body.entityId,
      },
    );
  }

  @Post('complete')
  @Scopes('files:write')
  async completeUpload(
    @Req() req: Request & { user?: AuthUser },
    @Body() body?: { fileId?: string },
  ) {
    if (!body?.fileId) {
      throw new BadRequestException('fileId is required');
    }

    if (typeof body.fileId !== 'string') {
      throw new BadRequestException('fileId must be a string');
    }

    return this.filesService.completeUpload(body.fileId, req.user as AuthUser);
  }

  @Get(':id')
  @Scopes('files:read')
  async getFile(
    @Param('id') id: string,
    @Req() req: Request & { user?: AuthUser },
  ) {
    return this.filesService.getFileForUser(id, req.user as AuthUser);
  }
}
