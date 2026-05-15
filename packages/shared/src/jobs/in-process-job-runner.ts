import type { JobHandler, JobRunner } from './job-runner';

interface QueuedJob {
  name: string;
  run: () => Promise<void>;
}

/** Minimal logger surface the runner uses to report job outcomes. */
export interface JobRunnerLogger {
  info(message: string): void;
  error(message: string, error: unknown): void;
}

/**
 * Runs jobs sequentially in the current process, one at a time, off the
 * critical request path. No external broker is required.
 *
 * A job failure is logged and the queue continues with the next job, so one
 * bad job never blocks the rest.
 */
export class InProcessJobRunner implements JobRunner {
  private readonly queue: QueuedJob[] = [];
  private processing = false;
  private idleResolvers: Array<() => void> = [];

  constructor(private readonly logger?: JobRunnerLogger) {}

  enqueue<TInput>(name: string, handler: JobHandler<TInput>, input: TInput): void {
    this.queue.push({ name, run: () => handler(input) });
    void this.process();
  }

  async drain(): Promise<void> {
    if (!this.processing && this.queue.length === 0) {
      return;
    }
    await new Promise<void>((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  private async process(): Promise<void> {
    if (this.processing) {
      return;
    }
    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (job === undefined) {
        break;
      }
      try {
        await job.run();
        this.logger?.info(`Job "${job.name}" completed`);
      } catch (error) {
        this.logger?.error(`Job "${job.name}" failed`, error);
      }
    }

    this.processing = false;
    const resolvers = this.idleResolvers;
    this.idleResolvers = [];
    for (const resolve of resolvers) {
      resolve();
    }
  }
}
