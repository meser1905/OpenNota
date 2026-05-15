import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@opennota/db';

/**
 * Thin NestJS-managed wrapper around the generated Prisma client. Opens the
 * SQLite connection on startup and closes it cleanly on shutdown.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Connected to the SQLite database');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
