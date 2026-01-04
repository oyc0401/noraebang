export const YOUTUBE_KEYS: string[] = [
  // TODO: 예시 키. 실제 YouTube API 키를 여기에 추가하세요.
  process.env.YOUTUBE_API_KEY ?? "",
].filter((key) => typeof key === "string" && key.trim());

