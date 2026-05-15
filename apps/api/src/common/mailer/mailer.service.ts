/** Options accepted by {@link MailerService.sendMail}. */
export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Mail abstraction. Consumers depend on this abstract class; the MVP binds it
 * to a file transport. A real SMTP implementation is a one-line provider swap.
 */
export abstract class MailerService {
  abstract sendMail(options: SendMailOptions): Promise<void>;
}
