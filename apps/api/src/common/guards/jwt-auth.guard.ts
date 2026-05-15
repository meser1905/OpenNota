import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AppConfig } from '../../config/app-config';
import type { JwtPayload } from '../auth/jwt-payload';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  user?: JwtPayload;
}

/**
 * Global guard. Verifies the `Authorization: Bearer <token>` access token and
 * attaches the decoded claims to the request. Routes marked `@Public()` pass
 * through untouched.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: AppConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const token = this.extractToken(request.headers.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      request.user = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.config.jwt.secret,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(header: string | string[] | undefined): string | null {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) {
      return null;
    }
    const [scheme, token] = value.split(' ');
    return scheme === 'Bearer' && token ? token : null;
  }
}
