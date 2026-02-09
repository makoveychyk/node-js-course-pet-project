import { Injectable } from '../framework/decorators.ts';
import { NotFoundError } from '../framework/exceptions.ts';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: number;
}

export interface CreateUserDto {
  name: string;
  email: string;
}

export interface UpdateUserDto {
  name: string;
  email: string;
}

export interface PatchUserDto {
  name?: string;
  email?: string;
}

@Injectable()
export class ClockService {
  now() {
    return Date.now();
  }
}

@Injectable()
export class AuditService {
  constructor(private readonly clock: ClockService) {}

  record(event: string, payload: Record<string, any>) {
    return {
      timestamp: this.clock.now(),
      event,
      payload,
    };
  }
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    { id: 1, name: 'Alice', email: 'alice@example.com', createdAt: Date.now() },
    { id: 2, name: 'Bob', email: 'bob@example.com', createdAt: Date.now() },
  ];

  constructor(private readonly audit: AuditService) {}

  findAll() {
    return this.users;
  }

  findById(id: number) {
    const user = this.users.find((item) => item.id === id);
    if (!user) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    return user;
  }

  create(payload: CreateUserDto) {
    const nextId = this.users.at(-1)?.id ?? 0;
    const user: User = {
      id: nextId + 1,
      name: payload.name,
      email: payload.email,
      createdAt: Date.now(),
    };
    this.users.push(user);
    const audit = this.audit.record('user.created', {
      id: user.id,
      email: user.email,
    });
    return { user, audit };
  }

  update(id: number, payload: UpdateUserDto) {
    const user = this.findById(id);
    user.name = payload.name;
    user.email = payload.email;
    const audit = this.audit.record('user.updated', { id: user.id });
    return { user, audit };
  }

  patch(id: number, payload: PatchUserDto) {
    const user = this.findById(id);
    if (payload.name !== undefined) {
      user.name = payload.name;
    }
    if (payload.email !== undefined) {
      user.email = payload.email;
    }
    const audit = this.audit.record('user.patched', { id: user.id });
    return { user, audit };
  }

  delete(id: number) {
    const index = this.users.findIndex((item) => item.id === id);
    if (index === -1) {
      throw new NotFoundError(`User with id ${id} not found`);
    }
    const [deleted] = this.users.splice(index, 1);
    const audit = this.audit.record('user.deleted', { id: deleted.id });
    return { user: deleted, audit };
  }
}
