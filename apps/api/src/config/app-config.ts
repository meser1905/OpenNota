import { resolve } from 'node:path';
import type { ConfigService } from '@nestjs/config';
import type { Env } from './env';

/**
 * Typed, resolved application configuration. Built once from the validated
 * environment; every module injects this instead of reading `process.env`.
 */
export class AppConfig {
  readonly nodeEnv: Env['NODE_ENV'];
  readonly port: number;
  readonly logLevel: Env['LOG_LEVEL'];
  readonly corsOrigin: string;
  readonly workspaceRoot: string;
  readonly jwt: { readonly secret: string; readonly expiresIn: string };
  readonly refreshToken: { readonly secret: string; readonly expiresIn: string };
  readonly email: { readonly from: string; readonly outputDir: string };
  readonly uploadDir: string;
  readonly pdfOutputDir: string;

  constructor(config: ConfigService<Env, true>, workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.nodeEnv = config.get('NODE_ENV', { infer: true });
    this.port = config.get('API_PORT', { infer: true });
    this.logLevel = config.get('LOG_LEVEL', { infer: true });
    this.corsOrigin = config.get('NEXTAUTH_URL', { infer: true });
    this.jwt = {
      secret: config.get('JWT_SECRET', { infer: true }),
      expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }),
    };
    this.refreshToken = {
      secret: config.get('REFRESH_TOKEN_SECRET', { infer: true }),
      expiresIn: config.get('REFRESH_TOKEN_EXPIRES_IN', { infer: true }),
    };
    this.email = {
      from: config.get('EMAIL_FROM', { infer: true }),
      outputDir: resolve(workspaceRoot, config.get('EMAIL_OUTPUT_DIR', { infer: true })),
    };
    this.uploadDir = resolve(workspaceRoot, config.get('UPLOAD_DIR', { infer: true }));
    this.pdfOutputDir = resolve(workspaceRoot, config.get('PDF_OUTPUT_DIR', { infer: true }));
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }
}
