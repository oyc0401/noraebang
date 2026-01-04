import path from "node:path";
import { promises as fs } from "node:fs";
import { fileURLToPath } from "node:url";

export interface YoutubeKeyConfig {
  keys: string[];
}

export class YoutubeKeyManager {
  private keys: string[] = [];
  private index = 0;

  static async fromFile(filePath: string) {
    const manager = new YoutubeKeyManager();
    await manager.loadFromFile(filePath);
    return manager;
  }

  async loadFromFile(filePath: string) {
    const resolvedPath = path.resolve(filePath);
    const content = await fs.readFile(resolvedPath, "utf-8");
    const parsed = JSON.parse(content) as YoutubeKeyConfig;

    if (!Array.isArray(parsed.keys) || parsed.keys.length === 0) {
      throw new Error("YouTube 키 목록이 비어 있습니다.");
    }

    this.keys = parsed.keys.filter((key) => typeof key === "string" && key.trim());
    if (this.keys.length === 0) {
      throw new Error("YouTube 키 목록에 사용할 수 있는 키가 없습니다.");
    }
    this.index = 0;
  }

  getCurrentKey() {
    if (this.keys.length === 0) {
      throw new Error("YouTube 키가 로드되지 않았습니다.");
    }
    return this.keys[this.index];
  }

  rotateKey() {
    if (this.keys.length === 0) {
      throw new Error("YouTube 키가 로드되지 않았습니다.");
    }
    this.index = (this.index + 1) % this.keys.length;
    return this.getCurrentKey();
  }

  async reuseWithRetry<T>(
    task: (apiKey: string) => Promise<T>,
    onError?: (error: unknown) => boolean,
  ): Promise<T> {
    const triedKeys = new Set<number>();

    while (triedKeys.size < this.keys.length) {
      const currentIndex = this.index;
      const apiKey = this.getCurrentKey();
      try {
        return await task(apiKey);
      } catch (error) {
        const shouldRotate = onError ? onError(error) : true;
        triedKeys.add(currentIndex);
        if (!shouldRotate || triedKeys.size >= this.keys.length) {
          throw error;
        }
        this.rotateKey();
      }
    }

    throw new Error("모든 YouTube 키를 사용했지만 요청이 실패했습니다.");
  }
}

let cachedManager: YoutubeKeyManager | null = null;

async function resolveKeysFile(): Promise<string> {
  const here = typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

  const candidates = [
    process.env.YOUTUBE_KEYS_FILE,
    path.resolve(process.cwd(), "lib/youtube/keys/keys.json"),
    path.resolve(process.cwd(), "../lib/youtube/keys/keys.json"),
    path.resolve(process.cwd(), "../../lib/youtube/keys/keys.json"),
    path.resolve(here, "keys.json"),
  ].filter((p): p is string => Boolean(p));

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error("YouTube keys file not found. Set YOUTUBE_KEYS_FILE env or add lib/youtube/keys/keys.json.");
}

export async function getYoutubeKeyManager(): Promise<YoutubeKeyManager> {
  if (cachedManager) return cachedManager;

  const keysPath = await resolveKeysFile();
  cachedManager = await YoutubeKeyManager.fromFile(keysPath);
  return cachedManager;
}
