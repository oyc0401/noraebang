import { YOUTUBE_KEYS } from "./keys";

// 쿼터 초과 에러인지 확인
function isQuotaError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("quota") || msg.includes("exceeded");
  }
  return false;
}

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

  getKeyCount() {
    return this.keys.length;
  }

  getCurrentKeyIndex() {
    return this.index;
  }

  rotateKey() {
    this.index = (this.index + 1) % this.keys.length;
    console.log(`🔄 YouTube API 키 로테이션: 키 ${this.index + 1}/${this.keys.length}로 전환`);
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
        // onError가 제공되면 사용, 없으면 쿼터 에러일 때만 로테이션
        const shouldRotate = onError ? onError(error) : isQuotaError(error);
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
