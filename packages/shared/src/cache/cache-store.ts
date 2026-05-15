/**
 * Cache abstraction.
 *
 * Consumers depend only on this interface, never on a concrete implementation.
 * The MVP ships {@link InMemoryCache}; swapping in a Redis-backed store later
 * requires no changes to business code. All methods are async so a networked
 * implementation is a drop-in replacement.
 */
export interface CacheStore {
  /** Returns the cached value, or `undefined` if missing or expired. */
  get<T>(key: string): Promise<T | undefined>;

  /** Stores a value, optionally expiring it after `ttlMs` milliseconds. */
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;

  /** Removes a single key. */
  delete(key: string): Promise<void>;

  /** Removes every key starting with `prefix`. Used for grouped invalidation. */
  deleteByPrefix(prefix: string): Promise<void>;

  /** Removes every key. */
  clear(): Promise<void>;

  /** Returns whether a non-expired value exists for `key`. */
  has(key: string): Promise<boolean>;
}
