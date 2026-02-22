import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

const toSeconds = (value?: string): number => {
  if (!value) {
    return 900;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d+)([smhd]?)$/i);
  if (!match) {
    const asNumber = Number(trimmed);
    return Number.isFinite(asNumber) ? asNumber : 900;
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();

  switch (unit) {
    case 's':
    case '':
      return amount;
    case 'm':
      return amount * 60;
    case 'h':
      return amount * 60 * 60;
    case 'd':
      return amount * 60 * 60 * 24;
    default:
      return amount;
  }
};

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const expiresInSeconds = toSeconds(
          configService.get<string>('JWT_EXPIRES_IN'),
        );

        return {
          secret: configService.getOrThrow<string>('JWT_SECRET'),
          signOptions: {
            expiresIn: expiresInSeconds,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
