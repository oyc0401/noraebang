import Kuroshiro from "kuroshiro";
import KuromojiAnalyzer from "kuroshiro-analyzer-kuromoji";

let kuroshiroPromise: Promise<Kuroshiro> | null = null;

export async function toHiragana(ja: string): Promise<string> {
  const value = ja.trim().replace(/\s+/g, " ");

  if (!value) {
    return "";
  }

  const kuroshiro = await getKuroshiro();
  const hiragana = await kuroshiro.convert(value, { to: "hiragana" });

  return katakanaToHiragana(hiragana).trim().replace(/\s+/g, " ");
}

async function getKuroshiro(): Promise<Kuroshiro> {
  kuroshiroPromise ??= createKuroshiro();

  return kuroshiroPromise;
}

async function createKuroshiro(): Promise<Kuroshiro> {
  const kuroshiro = new Kuroshiro();

  await kuroshiro.init(new KuromojiAnalyzer());

  return kuroshiro;
}

function katakanaToHiragana(value: string): string {
  return value.replace(/[\u30a1-\u30f6]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}
