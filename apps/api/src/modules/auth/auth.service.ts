import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@opennota/db';
import type {
  AuthenticatedUser,
  AuthTokens,
  LoginInput,
  RegisterInput,
  UserRole,
} from '@opennota/shared';
import bcrypt from 'bcryptjs';
import type { JwtPayload } from '../../common/auth/jwt-payload';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TokenService } from './token.service';

const BCRYPT_COST = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  /** Creates a user account. Restricted to ADMIN at the controller. */
  async register(input: RegisterInput): Promise<AuthenticatedUser> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
    const user = await this.prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: input.role,
      },
    });
    return this.toPublicUser(user);
  }

  async login(input: LoginInput): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('This account is disabled');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    return this.issueTokens(user);
  }

  /** Verifies a refresh token, rotates it, and issues a fresh token pair. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.tokenService.hashToken(refreshToken) },
    });
    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.deletedAt !== null) {
      throw new UnauthorizedException('Account is no longer active');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(user);
  }

  /** Revokes a refresh token so it can no longer be exchanged. */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.tokenService.hashToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async getProfile(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt !== null) {
      throw new UnauthorizedException('Account not found');
    }
    return this.toPublicUser(user);
  }

  private async issueTokens(user: User): Promise<AuthTokens> {
    const publicUser = this.toPublicUser(user);
    const payload: JwtPayload = { sub: user.id, email: user.email, role: publicUser.role };
    const accessToken = await this.tokenService.signAccessToken(payload);
    const refresh = await this.tokenService.signRefreshToken(payload);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokenService.hashToken(refresh.token),
        expiresAt: refresh.expiresAt,
      },
    });
    return { accessToken, refreshToken: refresh.token, user: publicUser };
  }

  private toPublicUser(user: User): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserRole,
    };
  }
}
