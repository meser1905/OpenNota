import { BadRequestException, type PipeTransform } from '@nestjs/common';
import { type ZodSchema, ZodError } from 'zod';

/**
 * Validates and coerces a request payload against a Zod schema. Applied per
 * route to bodies, queries and params, e.g.
 * `@Body(new ZodValidationPipe(loginSchema)) body: LoginInput`.
 *
 * Validation failures become a 400 with structured `details`, matching the
 * shape produced by the global exception filter.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          error: 'Bad Request',
          message: 'Validation failed',
          details: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      throw error;
    }
  }
}
