import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

interface YoutubeKeyConfig {
  keys: string[];
}

class YoutubeApiKeyManager {
  private readonly keys: string[];
  private currentIndex = 0;

  constructor(keys: string[]) {
    if (!keys.length) {
      throw new Error(
        "[YouTubeKeyManager] No API keys found inside youtube/keys.json",
      );
    }
    this.keys = keys;
  }

  getCurrentKey(): string {
    return this.keys[this.currentIndex];
  }

  advanceToNextKey(): boolean {
    if (this.currentIndex < this.keys.length - 1) {
      this.currentIndex += 1;
      return true;
    }

    return false;
  }

  getCurrentPosition(): number {
    return this.currentIndex + 1;
  }

  getTotalKeys(): number {
    return this.keys.length;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEY_FILE_PATH = path.resolve(__dirname, "../../../youtube/keys.json");

function loadKeysFromFile(): string[] {
  if (!fs.existsSync(KEY_FILE_PATH)) {
    throw new Error(
      `[YouTubeKeyManager] youtube/keys.json not found at ${KEY_FILE_PATH}`,
    );
  }

  const raw = fs.readFileSync(KEY_FILE_PATH, "utf-8");
  const parsed = JSON.parse(raw) as YoutubeKeyConfig;

  if (!Array.isArray(parsed?.keys) || parsed.keys.length === 0) {
    throw new Error(
      "[YouTubeKeyManager] youtube/keys.json must contain a non-empty `keys` array",
    );
  }

  return parsed.keys;
}

const internalManager = new YoutubeApiKeyManager(loadKeysFromFile());

export function getYoutubeApiKey(): string {
  return internalManager.getCurrentKey();
}

export function rotateYoutubeApiKey(): boolean {
  const switched = internalManager.advanceToNextKey();
  if (!switched) {
    console.warn(
      "[YouTubeKeyManager] All configured YouTube API keys are exhausted.",
    );
    return false;
  }

  console.warn(
    `[YouTubeKeyManager] Switched to fallback YouTube API key (${internalManager.getCurrentPosition()}/${internalManager.getTotalKeys()}).`,
  );
  return true;
}
