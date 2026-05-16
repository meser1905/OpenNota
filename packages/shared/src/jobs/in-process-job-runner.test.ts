import { describe, expect, it } from 'vitest';
import { InProcessJobRunner } from './in-process-job-runner';

/** Unit tests for the in-process background {@link InProcessJobRunner}. */
describe('InProcessJobRunner', () => {
  it('runs an enqueued job and resolves drain() once it settles', async () => {
    const runner = new InProcessJobRunner();
    let ran = false;

    runner.enqueue(
      'mark',
      async () => {
        ran = true;
      },
      undefined,
    );
    await runner.drain();

    expect(ran).toBe(true);
  });

  it('passes the supplied input to the handler', async () => {
    const runner = new InProcessJobRunner();
    let received: { id: string } | undefined;

    runner.enqueue(
      'with-input',
      async (input: { id: string }) => {
        received = input;
      },
      { id: 'abc' },
    );
    await runner.drain();

    expect(received).toEqual({ id: 'abc' });
  });

  it('runs jobs sequentially in enqueue order', async () => {
    const runner = new InProcessJobRunner();
    const order: number[] = [];

    for (const n of [1, 2, 3]) {
      runner.enqueue(
        'seq',
        async () => {
          order.push(n);
        },
        undefined,
      );
    }
    await runner.drain();

    expect(order).toEqual([1, 2, 3]);
  });

  it('continues with the next job after one fails', async () => {
    const errors: unknown[] = [];
    const runner = new InProcessJobRunner({
      info: () => {},
      error: (_message, error) => errors.push(error),
    });
    let secondRan = false;

    runner.enqueue(
      'bad',
      async () => {
        throw new Error('boom');
      },
      undefined,
    );
    runner.enqueue(
      'good',
      async () => {
        secondRan = true;
      },
      undefined,
    );
    await runner.drain();

    expect(secondRan).toBe(true);
    expect(errors).toHaveLength(1);
  });

  it('drain() resolves immediately when the queue is idle', async () => {
    const runner = new InProcessJobRunner();
    await expect(runner.drain()).resolves.toBeUndefined();
  });
});
