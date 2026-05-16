import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@opennota/db';
import type { ApiErrorResponse } from '@opennota/shared';
import { ZodError } from 'zod';

interface ResponseLike {
  status(code: number): ResponseLike;
  json(body: unknown): void;
}
interface RequestLike {
  url: string;
}
interface ErrorDescription {
  status: number;
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Global exception filter. Every error — HTTP, Zod, Prisma or unexpected — is
 * rendered into the single {@link ApiErrorResponse} shape so API consumers
 * never have to special-case error bodies.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<ResponseLike>();
    const request = ctx.getRequest<RequestLike>();
    const description = this.describe(exception);

    const body: ApiErrorResponse = {
      statusCode: description.status,
      error: description.error,
      message: description.message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    if (description.details !== undefined) {
      body.details = description.details;
    }

    if (description.status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.url} -> ${description.status} ${description.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`${request.url} -> ${description.status} ${description.message}`);
    }

    response.status(description.status).json(body);
  }

  private describe(exception: unknown): ErrorDescription {
    if (exception instanceof HttpException) {
      return this.describeHttp(exception);
    }
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Validation failed',
        details: exception.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.describePrisma(exception);
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    };
  }

  private describeHttp(exception: HttpException): ErrorDescription {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return { status, error: this.reason(status), message: payload };
    }
    const record = payload as { message?: unknown; error?: unknown; details?: unknown };
    const message = Array.isArray(record.message)
      ? record.message.join('; ')
      : typeof record.message === 'string'
        ? record.message
        : this.reason(status);
    return {
      status,
      error: typeof record.error === 'string' ? record.error : this.reason(status),
      message,
      details: record.details,
    };
  }

  private describePrisma(exception: Prisma.PrismaClientKnownRequestError): ErrorDescription {
    switch (exception.code) {
      case 'P2002':
        return {
          status: HttpStatus.CONFLICT,
          error: 'Conflict',
          message: 'A record with these values already exists',
        };
      case 'P2025':
        return {
          status: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: 'The requested record was not found',
        };
      case 'P2003':
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'A related record required by this operation does not exist',
        };
      default:
        return {
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: 'The database rejected this request',
        };
    }
  }

  private reason(status: number): string {
    const name = HttpStatus[status];
    if (typeof name !== 'string') {
      return 'Error';
    }
    return name
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
