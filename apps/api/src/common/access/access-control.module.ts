import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';

/**
 * Global module exposing {@link AccessControlService} to every feature module
 * without an explicit import, mirroring how {@link PrismaModule} is wired.
 */
@Global()
@Module({
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
