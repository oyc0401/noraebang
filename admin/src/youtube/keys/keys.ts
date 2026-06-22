function parseEnvKeys(): string[] {
  const rawList = process.env.YOUTUBE_API_KEYS;
  if (rawList) {
    const keys = rawList
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);
    if (keys.length) {
      return keys;
    }
  }

  const singleKey = process.env.YOUTUBE_API_KEY?.trim();
  if (singleKey) {
    return [singleKey];
  }

  throw new Error(
    "YOUTUBE_API_KEYS 환경변수가 비어 있습니다. 쉼표로 구분된 키 목록을 .env에 설정해주세요.",
  );
}

export function getYoutubeKeys(): string[] {
  return parseEnvKeys();
}
