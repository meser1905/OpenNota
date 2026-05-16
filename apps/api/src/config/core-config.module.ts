import { join } from 'node:path';
import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppConfig } from './app-config';
import { type Env, findWorkspaceRoot, validateEnv } from './env';

const workspaceRoot = findWorkspaceRoot();

/**
 * Loads and validates the repo-root `.env`, then exposes the typed
 * {@link AppConfig} globally.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: [join(workspaceRoot, '.env')],
      validate: validateEnv,
    }),
  ],
  providers: [
    {
      provide: AppConfig,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>): AppConfig =>
        new AppConfig(configService, workspaceRoot),
    },
  ],
  exports: [AppConfig, ConfigModule],
})
export class CoreConfigModule {}
