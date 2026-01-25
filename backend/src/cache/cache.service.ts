import { Injectable } from "@nestjs/common";
import { LRUCache } from "lru-cache";

type CacheNamespace = "songs:sort" | "songs:artist";

interface CacheOptions {
  /** TTL in milliseconds (default: 5 minutes) */
  ttl?: number;
  /** Max items in cache (default: 100) */
  max?: number;
}

const DEFAULT_TTL = 30 * 60 * 1000; // 30분
const DEFAULT_MAX = 100;

// lru-cache는 value 타입이 {} 제약을 만족해야 함
type CacheValue = Record<string, unknown>;
type CacheInstance = LRUCache<string, CacheValue>;

@Injectable()
export class CacheService {
  private caches = new Map<CacheNamespace, CacheInstance>();

  private getCache(namespace: CacheNamespace): CacheInstance {
    let cache = this.caches.get(namespace);
    if (!cache) {
      cache = new LRUCache<string, CacheValue>({
        max: DEFAULT_MAX,
        ttl: DEFAULT_TTL,
      });
      this.caches.set(namespace, cache);
    }
    return cache;
  }

  get<T extends CacheValue>(
    namespace: CacheNamespace,
    key: string,
  ): T | undefined {
    const cache = this.getCache(namespace);
    return cache.get(key) as T | undefined;
  }

  set<T extends CacheValue>(
    namespace: CacheNamespace,
    key: string,
    value: T,
    options?: CacheOptions,
  ): void {
    const cache = this.getCache(namespace);
    cache.set(key, value, { ttl: options?.ttl });
  }

  invalidate(namespace: CacheNamespace, key: string): void {
    const cache = this.getCache(namespace);
    cache.delete(key);
  }

  invalidateNamespace(namespace: CacheNamespace): void {
    const cache = this.caches.get(namespace);
    if (cache) {
      cache.clear();
    }
  }

  invalidateAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }
}
