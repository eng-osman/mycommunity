export interface CacheMetadata<T> {
  serializeAndCache(object: T, expiration?: string): Promise<boolean>;

  deserializeCached(key: string): Promise<T | null>;
}
