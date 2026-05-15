import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

/** Liveness endpoint, used by tooling and the CI smoke check. */
@Controller('health')
export class AppController {
  @Public()
  @Get()
  check(): { status: string; service: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'opennota-api',
      timestamp: new Date().toISOString(),
    };
  }
}
