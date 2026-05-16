import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { JwtPayload } from '../auth/jwt-payload';

/** Injects the authenticated user's access-token claims into a handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): JwtPayload => {
    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    if (!request.user) {
      throw new UnauthorizedException('Authentication required');
    }
    return request.user;
  },
);
