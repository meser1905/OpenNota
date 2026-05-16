import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/** User, profile and guardian-link management. ADMIN-only. */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
