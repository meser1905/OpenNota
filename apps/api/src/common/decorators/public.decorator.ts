import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'opennota:isPublic';

/** Marks a route as reachable without authentication. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
