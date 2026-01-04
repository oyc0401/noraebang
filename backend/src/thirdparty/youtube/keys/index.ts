import { YOUTUBE_KEYS } from "./keys.js";

export class YoutubeKeyManager {
  private readonly keys: string[];
  private index = 0;

  constructor(keys: string[]) {
    if (!keys.length) {
      throw new Error("YouTube 키 목록이 비어 있습니다.");
    }
    this.keys = keys;
  }

  getCurrentKey() {
    return this.keys[this.index];
  }

  rotateKey() {
    this.index = (this.index + 1) % this.keys.length;
    return this.getCurrentKey();
  }

  async reuseWithRetry<T>(
    task: (apiKey: string) => Promise<T>,
    onError?: (error: unknown) => boolean,
  ): Promise<T> {
    const tried = new Set<number>();
    while (tried.size < this.keys.length) {
      const currentIndex = this.index;
      try {
        return await task(this.getCurrentKey());
      } catch (error) {
        const shouldRotate = onError ? onError(error) : true;
        tried.add(currentIndex);
        if (!shouldRotate || tried.size >= this.keys.length) {
          throw error;
        }
        this.rotateKey();
      }
    }
    throw new Error("모든 YouTube 키를 사용했지만 요청이 실패했습니다.");
  }
}

let cachedManager: YoutubeKeyManager | null = null;

export function getYoutubeKeyManager(): YoutubeKeyManager {
  if (!cachedManager) {
    cachedManager = new YoutubeKeyManager(YOUTUBE_KEYS);
  }
  return cachedManager;
}
