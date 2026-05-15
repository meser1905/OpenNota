import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfig } from './config/app-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(AppConfig);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({ origin: config.corsOrigin, credentials: true });
  app.enableShutdownHooks();

  await app.listen(config.port);
  app.get(Logger).log(`OpenNota API ready on http://localhost:${config.port}/api`);
}

bootstrap().catch((error: unknown) => {
  console.error('Failed to start the OpenNota API', error);
  process.exit(1);
});
