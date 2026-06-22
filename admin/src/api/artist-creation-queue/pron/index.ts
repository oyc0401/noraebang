import { kanaToHangul } from "kanabarum";
import { latinToHangul } from "konglish";

export async function getJaPron(ja: string): Promise<string | null> {
  const value = normalizeInput(ja);

  if (!value) {
    return null;
  }

  return normalizePron(await kanaToHangul(value));
}

export function getLatinPron(la: string): string | null {
  const value = normalizeInput(la);

  if (!value) {
    return null;
  }

  return normalizePron(latinToHangul(value));
}

function normalizeInput(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized || null;
}

function normalizePron(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, " ");

  return normalized || null;
}
