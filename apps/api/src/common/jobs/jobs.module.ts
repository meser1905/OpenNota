import { Global, Logger, Module } from '@nestjs/common';
import { InProcessJobRunner, type JobRunner } from '@opennota/shared';

/**
 * Injection token for the {@link JobRunner} abstraction. Inject it as:
 * `@Inject(JOB_RUNNER) private readonly jobs: JobRunner`.
 */
export const JOB_RUNNER = Symbol('JOB_RUNNER');

/**
 * Provides the in-process job runner. Swapping in a BullMQ-backed `JobRunner`
 * here is the only change needed to move background work onto a broker.
 */
@Global()
@Module({
  providers: [
    {
      provide: JOB_RUNNER,
      useFactory: (): JobRunner => {
        const logger = new Logger('JobRunner');
        return new InProcessJobRunner({
          info: (message) => logger.log(message),
          error: (message, error) => logger.error(message, error),
        });
      },
    },
  ],
  exports: [JOB_RUNNER],
})
export class JobsModule {}
