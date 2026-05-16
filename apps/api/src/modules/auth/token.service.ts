import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { AppConfig } from '../../config/app-config';

const FALLBACK_REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Signs and verifies access/refresh JWTs and hashes refresh tokens for storage. */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: AppConfig,
  ) {}

  signAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.signAsync(payload, this.signOptions(this.config.jwt));
  }

  async signRefreshToken(payload: JwtPayload): Promise<{ token: string; expiresAt: Date }> {
    const token = await this.jwtService.signAsync(
      payload,
      this.signOptions(this.config.refreshToken),
    );
    const decoded = this.jwtService.decode(token) as { exp?: number } | null;
    const expiresAt =
      decoded?.exp !== undefined
        ? new Date(decoded.exp * 1000)
        : new Date(Date.now() + FALLBACK_REFRESH_TTL_MS);
    return { token, expiresAt };
  }

  verifyRefreshToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.config.refreshToken.secret,
    });
  }

  /** SHA-256 hash; refresh tokens are stored hashed so the raw token never is. */
  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Builds JWT sign options. `expiresIn` comes from configuration as a plain
   * string such as "15m"; jsonwebtoken parses these at runtime, but its
   * published types only accept a narrower literal form.
   */
  private signOptions(source: { secret: string; expiresIn: string }): JwtSignOptions {
    return {
      secret: source.secret,
      expiresIn: source.expiresIn as unknown as JwtSignOptions['expiresIn'],
    };
  }
}
