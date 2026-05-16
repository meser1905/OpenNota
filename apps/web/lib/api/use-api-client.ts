'use client';

import { useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { apiFetch, type ApiRequestOptions } from '@/lib/api-client';

/** Query parameters accepted by the browser API client. */
export type ApiQuery = ApiRequestOptions['query'];

/** A memoized, token-aware wrapper around {@link apiFetch} for client components. */
export interface ApiClient {
  get: <T>(path: string, query?: ApiQuery) => Promise<T>;
  post: <T>(path: string, body: unknown) => Promise<T>;
  patch: <T>(path: string, body: unknown) => Promise<T>;
  put: <T>(path: string, body: unknown) => Promise<T>;
  del: (path: string) => Promise<void>;
}

/**
 * Returns an API client bound to the current session's access token. The
 * client is memoized on the token so it is stable across renders.
 */
export function useApiClient(): ApiClient {
  const { data: session } = useSession();
  const token = session?.accessToken;

  return useMemo<ApiClient>(
    () => ({
      get: (path, query) => apiFetch(path, { token, query }),
      post: (path, body) => apiFetch(path, { token, method: 'POST', body }),
      patch: (path, body) => apiFetch(path, { token, method: 'PATCH', body }),
      put: (path, body) => apiFetch(path, { token, method: 'PUT', body }),
      del: (path) => apiFetch(path, { token, method: 'DELETE' }),
    }),
    [token],
  );
}
