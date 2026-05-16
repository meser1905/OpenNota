import { Global, Module } from '@nestjs/common';
import { FileMailerService } from './file-mailer.service';
import { MailerService } from './mailer.service';

@Global()
@Module({
  providers: [{ provide: MailerService, useClass: FileMailerService }],
  exports: [MailerService],
})
export class MailerModule {}
