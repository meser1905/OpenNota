import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AccessControlModule } from './common/access/access-control.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CacheModule } from './common/cache/cache.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { JobsModule } from './common/jobs/jobs.module';
import { MailerModule } from './common/mailer/mailer.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { AppConfig } from './config/app-config';
import { CoreConfigModule } from './config/core-config.module';
import { AcademicModule } from './modules/academic/academic.module';
import { AuthModule } from './modules/auth/auth.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { GradesModule } from './modules/grades/grades.module';
import { InstitutionsModule } from './modules/institutions/institutions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    CoreConfigModule,
    LoggerModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.logLevel,
          transport: config.isProduction
            ? undefined
            : {
                target: 'pino-pretty',
                options: { singleLine: true, translateTime: 'SYS:standard' },
              },
          autoLogging: true,
          redact: { paths: ['req.headers.authorization', 'req.headers.cookie'], remove: true },
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AccessControlModule,
    CacheModule,
    JobsModule,
    MailerModule,
    AuthModule,
    InstitutionsModule,
    AcademicModule,
    UsersModule,
    EvaluationsModule,
    GradesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
