import { Module } from '../framework/index.ts';
import { UsersController } from './users.controller.ts';
import { AuditService, ClockService, UsersService } from './users.service.ts';
import { ApiKeyGuard } from './guards.ts';
import { TimingInterceptor } from './interceptors.ts';
import { JsonErrorFilter } from './filters.ts';
import { PositiveNumberPipe, RequestLogPipe } from './pipes.ts';

@Module({
  providers: [
    ClockService,
    AuditService,
    UsersService,
    ApiKeyGuard,
    TimingInterceptor,
    JsonErrorFilter,
    PositiveNumberPipe,
    RequestLogPipe,
  ],
  controllers: [UsersController],
})
export class MiniAppModule {}
