import { Global, Module } from '@nestjs/common';
import { type CacheStore, InMemoryCache } from '@opennota/shared';

/**
 * Injection token for the {@link CacheStore} abstraction. Inject it as:
 * `@Inject(CACHE_STORE) private readonly cache: CacheStore`.
 */
export const CACHE_STORE = Symbol('CACHE_STORE');

/**
 * Provides the process-local cache. Swapping in a Redis-backed `CacheStore`
 * here is the only change needed to scale the cache out.
 */
@Global()
@Module({
  providers: [
    {
      provide: CACHE_STORE,
      useFactory: (): CacheStore => new InMemoryCache(),
    },
  ],
  exports: [CACHE_STORE],
})
export class CacheModule {}
