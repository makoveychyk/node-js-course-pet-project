import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(email: string): Promise<User> {
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      return existing;
    }

    const user = this.usersRepository.create({ email });
    return this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async assertExists(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async setAvatarFile(userId: string, fileId: string): Promise<void> {
    await this.usersRepository.update(userId, { avatarFileId: fileId });
  }
}
