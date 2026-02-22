import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileRecord } from './file-record.entity';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { UsersModule } from '../users/users.module';
import { User } from '../users/user.entity';
import { ScopesGuard } from '../auth/scopes.guard';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    TypeOrmModule.forFeature([FileRecord, User]),
  ],
  controllers: [FilesController],
  providers: [FilesService, ScopesGuard],
  exports: [FilesService],
})
export class FilesModule {}
