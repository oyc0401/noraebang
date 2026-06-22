import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { YoutubeVideoSearchResponse } from "./search";

type YoutubeSearchCacheSchema = {
  entries: Record<string, YoutubeSearchCacheEntry>;
};

type YoutubeSearchCacheEntry = {
  cachedAt: string;
  response: YoutubeVideoSearchResponse;
};

const CACHE_DIR = path.join(process.cwd(), "src/youtube/cache");
const CACHE_FILE = path.join(CACHE_DIR, "youtube-search-cache.json");

export async function getCachedYoutubeSearch(
  key: string,
): Promise<YoutubeVideoSearchResponse | null> {
  const cache = await readCache();

  return cache.entries[key]?.response ?? null;
}

export async function saveYoutubeSearchCache(
  key: string,
  response: YoutubeVideoSearchResponse,
) {
  const cache = await readCache();

  cache.entries[key] = {
    cachedAt: new Date().toISOString(),
    response,
  };

  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

export function buildSearchCacheKey(query: string, maxResults: number) {
  return JSON.stringify({
    query: query.trim(),
    maxResults,
  });
}

async function readCache(): Promise<YoutubeSearchCacheSchema> {
  try {
    const raw = await readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<YoutubeSearchCacheSchema>;

    return {
      entries: parsed.entries ?? {},
    };
  } catch {
    return { entries: {} };
  }
}
