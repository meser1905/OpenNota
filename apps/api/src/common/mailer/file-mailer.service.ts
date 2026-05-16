import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { AppConfig } from '../../config/app-config';
import { MailerService, type SendMailOptions } from './mailer.service';

/**
 * Development mailer. Renders each message with Nodemailer's stream transport
 * and writes it as a standard `.eml` file that any mail client can open. No
 * SMTP server, no external service.
 */
@Injectable()
export class FileMailerService extends MailerService {
  private readonly logger = new Logger(FileMailerService.name);
  private readonly transporter: Transporter;

  constructor(private readonly config: AppConfig) {
    super();
    this.transporter = nodemailer.createTransport({ streamTransport: true, buffer: true });
  }

  async sendMail(options: SendMailOptions): Promise<void> {
    const info = await this.transporter.sendMail({
      from: this.config.email.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    await mkdir(this.config.email.outputDir, { recursive: true });
    const safeRecipient = options.to.replace(/[^a-z0-9]/gi, '_');
    const fileName = `${Date.now()}-${safeRecipient}.eml`;
    const filePath = join(this.config.email.outputDir, fileName);
    await writeFile(filePath, info.message);

    this.logger.log(`Email saved to ${filePath}`);
  }
}
