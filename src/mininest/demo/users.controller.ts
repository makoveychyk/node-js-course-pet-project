import { z } from 'zod';
import {
  Body,
  Controller,
  Get,
  Put,
  Patch,
  Delete,
  Param,
  Post,
  Query,
  UseFilter,
  UseGuard,
  UseInterceptor,
  UsePipe,
} from '../framework/index.ts';
import {
  ParseIntPipe,
  ToBooleanPipe,
  TrimPipe,
  ZodValidationPipe,
} from '../framework/pipes.ts';
import { UsersService } from './users.service.ts';
import { ApiKeyGuard } from './guards.ts';
import { TimingInterceptor } from './interceptors.ts';
import { JsonErrorFilter } from './filters.ts';
import { PositiveNumberPipe } from './pipes.ts';

const createUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
});

const updateUserSchema = createUserSchema;
const patchUserSchema = z.object({
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
});

@Controller('mini/users')
@UsePipe(TrimPipe)
@UseFilter(JsonErrorFilter)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @UseGuard(ApiKeyGuard)
  @UseInterceptor(TimingInterceptor)
  findOne(
    @Param('id', ParseIntPipe, PositiveNumberPipe) id: number,
    @Query('verbose', ToBooleanPipe) verbose?: boolean,
  ) {
    const user = this.usersService.findById(id);
    if (verbose) {
      return user;
    }
    return { id: user.id, name: user.name };
  }

  @Post()
  @UseGuard(ApiKeyGuard)
  @UseInterceptor(TimingInterceptor)
  create(
    @Body(undefined, new ZodValidationPipe(createUserSchema)) body: {
      name: string;
      email: string;
    },
  ) {
    return this.usersService.create(body);
  }

  @Put(':id')
  @UseGuard(ApiKeyGuard)
  @UseInterceptor(TimingInterceptor)
  update(
    @Param('id', ParseIntPipe, PositiveNumberPipe) id: number,
    @Body(undefined, new ZodValidationPipe(updateUserSchema)) body: {
      name: string;
      email: string;
    },
  ) {
    return this.usersService.update(id, body);
  }

  @Patch(':id')
  @UseGuard(ApiKeyGuard)
  @UseInterceptor(TimingInterceptor)
  patch(
    @Param('id', ParseIntPipe, PositiveNumberPipe) id: number,
    @Body(undefined, new ZodValidationPipe(patchUserSchema)) body: {
      name?: string;
      email?: string;
    },
  ) {
    return this.usersService.patch(id, body);
  }

  @Delete(':id')
  @UseGuard(ApiKeyGuard)
  @UseInterceptor(TimingInterceptor)
  remove(@Param('id', ParseIntPipe, PositiveNumberPipe) id: number) {
    return this.usersService.delete(id);
  }
}
