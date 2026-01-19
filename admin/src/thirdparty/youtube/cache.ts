import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSONFilePreset } from "lowdb/node";

import type { YoutubeVideoSearchResponse } from "./search.ts";

type YoutubeSearchCacheSchema = {
  entries: Record<string, YoutubeSearchCacheEntry>;
};

type YoutubeSearchCacheEntry = {
  cachedAt: string;
  response: YoutubeVideoSearchResponse;
};

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(currentDir, "cache");
const CACHE_FILE = path.join(CACHE_DIR, "youtube-search-cache.json");

const cacheDbPromise = initCache();

async function initCache() {
  await mkdir(CACHE_DIR, { recursive: true });
  return JSONFilePreset<YoutubeSearchCacheSchema>(CACHE_FILE, {
    entries: {},
  });
}

export async function getCachedYoutubeSearch(
  key: string,
): Promise<YoutubeVideoSearchResponse | null> {
  const db = await cacheDbPromise;
  await db.read();
  return db.data.entries[key]?.response ?? null;
}

export async function saveYoutubeSearchCache(
  key: string,
  response: YoutubeVideoSearchResponse,
) {
  const db = await cacheDbPromise;
  await db.read();
  db.data.entries[key] = {
    cachedAt: new Date().toISOString(),
    response,
  };
  await db.write();
}

export function buildSearchCacheKey(query: string, maxResults: number) {
  return JSON.stringify({
    query: query.trim(),
    maxResults,
  });
}
