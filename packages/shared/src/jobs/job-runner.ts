/**
 * Background job abstraction.
 *
 * Consumers depend only on this interface. The MVP ships an in-process runner
 * ({@link InProcessJobRunner}); it can later be replaced with a broker-backed
 * runner (BullMQ, etc.) without touching business code.
 */
export type JobHandler<TInput> = (input: TInput) => Promise<void>;

export interface JobRunner {
  /**
   * Schedules `handler` to run with `input`. Returns immediately; the job runs
   * asynchronously. Failures are reported to the runner's logger, not thrown.
   */
  enqueue<TInput>(name: string, handler: JobHandler<TInput>, input: TInput): void;

  /** Resolves once every currently queued job has settled. Primarily a test aid. */
  drain(): Promise<void>;
}
