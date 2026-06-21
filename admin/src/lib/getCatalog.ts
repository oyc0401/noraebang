export type Catalog = "JPOP" | "KPOP";

const JAPANESE_KANA = /[\u3040-\u309f\u30a0-\u30ff]/;
const KOREAN_HANGUL = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f]/;

export function getCatalog(
  title: string,
  artist: string | null,
): Catalog | null {
  const text = `${title} ${artist ?? ""}`;

  if (JAPANESE_KANA.test(text)) {
    return "JPOP";
  }

  if (KOREAN_HANGUL.test(text)) {
    return "KPOP";
  }

  return null;
}
