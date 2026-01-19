import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { prisma, disconnect } from "../../prisma.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OUTPUT_FILE = path.join(
  __dirname,
  "../../../output/song-title-check/pending-fixes.json",
);
const BATCH_THRESHOLD = 100;

const SYSTEM_PROMPT = `You are a Japanese/Korean song title validator with web search capability.
Use web search to verify official English/Latin titles on YouTube and Spotify.
Return ONLY valid JSON array. No markdown. No extra text.`;

const DEVELOPER_PROMPT = `Output schema: Array<{songId: number, titleJa?: string, titleLatin?: string}>

Only include songs that need fixing. If a song is correct, do not include it.
Each field you include means "change this field to this value".
title is immutable - never include it in output.

IMPORTANT: Use web search to find official English titles on YouTube/Spotify.
Check YouTube Music, Spotify, Apple Music, label press releases, or official artist sites. If any of these sources use a marketed English alias, you must output that exact alias (case/punctuation sensitive) even if it is very different from the Japanese title. Example: Aimyon's 「ひかりもの」 is branded as "Raw Like Sushi".
titleLatin is NOT just romanization/pronunciation. It's the official English title used on streaming platforms or documented in official press. Only fall back to romanization/null when no official alias exists anywhere.`;

interface SongInput {
  songId: number;
  title: string;
  titleJa?: string;
  titleLatin?: string;
}

interface ArtistInput {
  artistId: number;
  artistName: string;
  songs: SongInput[];
}

interface SongFix {
  songId: number;
  titleJa?: string;
  titleLatin?: string;
}

interface ArtistFix {
  artistId: number;
  artistName: string;
  fixes: SongFix[];
}

function buildUserPrompt(artist: ArtistInput): string {
  const inputJson = JSON.stringify(artist.songs);
  return `아티스트: ${artist.artistName} (ID: ${artist.artistId})

곡 목록:
${inputJson}

titleJa, titleLatin이 올바른지 검증해라. (title은 불변, 수정 대상 아님)

⚠️ 웹 검색 필수: titleLatin이 로마자 발음인지 공식 영어 제목인지 확인하려면 반드시 웹 검색해라.
검색어 예시: "아티스트명 곡명 official english title" 또는 "아티스트명 곡명 spotify"

필드 규칙:
- titleJa: 일본어(히라가나/카타카나/한자)만 허용. 한국어가 들어있으면 안 됨. title과 같아도 됨.
- titleLatin: 유튜브/스포티파이에서 공식적으로 사용되는 영어 제목. 로마자 발음(romanization) 절대 금지!

⚠️⚠️⚠️ titleLatin 중요 규칙 ⚠️⚠️⚠️
titleLatin은 로마자 발음이 아니라 아티스트가 공식 발표한 영어 제목이어야 함.
- "Zanki" ❌ (로마자 발음) → "Time Left" ✓ (공식 영어 제목)
- "Nani ga Warui" ❌ (로마자 발음) → "What is wrong with" ✓ (공식 영어 제목)
- "Last Teen" ❌ (단순번역) → "Last Teenage Days" ✓ (공식 영어 제목)
- "Hikarimono" ❌ (로마자 발음) → "Raw Like Sushi" ✓ (아이묭 「ひかりもの」의 공식 영어 제목)

⚠️ title이 이미 영어/라틴인 경우 (예: "UFO", "LOVE") → titleLatin에도 그대로 유지해야 함. null로 바꾸면 안 됨!

공식 영어 제목이 없는 일본어/한국어 곡만 titleLatin을 null로 설정해라.

수정이 필요한 경우만 출력:
- titleLatin이 로마자 발음인 경우 → 공식 영어 제목으로 수정하거나 null
- 완전히 다른 곡 제목이 잘못 매핑된 경우
- 언어가 잘못된 필드 (예: titleJa에 한국어가 있음)

애매하면 웹 검색해서 확인해라. 검색해도 공식 영어 제목을 못 찾으면 null로.

출력 규칙:
- titleJa, titleLatin 동시 수정 가능
- 필드를 제거하려면 null을 넣어라

출력 예시:
[
  {
    "songId": 123,
    "titleLatin": "Correct English Title"
  },
  {
    "songId": 456,
    "titleJa": null
  }
]

수정할 곡이 없으면 빈 배열 []을 반환.`;
}

async function callGPT(artist: ArtistInput): Promise<SongFix[]> {
  try {
    const response = await openai.responses.create({
      model: "gpt-5.2",
      instructions: SYSTEM_PROMPT,
      input: [
        { role: "developer", content: DEVELOPER_PROMPT },
        { role: "user", content: buildUserPrompt(artist) },
      ],
      tools: [{ type: "web_search" }],
      temperature: 0,
    });

    // Responses API에서 텍스트 추출
    const outputMessage = response.output.find(
      (item) => item.type === "message",
    );
    if (!outputMessage || outputMessage.type !== "message") {
      console.error("GPT 응답 없음");
      return [];
    }

    const textContent = outputMessage.content.find(
      (c) => c.type === "output_text",
    );
    if (!textContent || textContent.type !== "output_text") {
      console.error("GPT 텍스트 응답 없음");
      return [];
    }

    const content = textContent.text;
    console.log(
      `  → GPT 응답: ${content.slice(0, 200)}${content.length > 200 ? "..." : ""}`,
    );

    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("GPT 호출 실패:", error);
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PendingFixes {
  createdAt: string;
  results: ArtistFix[];
}

async function loadPendingFixes(): Promise<PendingFixes> {
  try {
    const content = await readFile(OUTPUT_FILE, "utf-8");
    return JSON.parse(content);
  } catch {
    return {
      createdAt: new Date().toISOString(),
      results: [],
    };
  }
}

async function savePendingFixes(data: PendingFixes): Promise<void> {
  const dir = path.dirname(OUTPUT_FILE);
  await import("node:fs/promises").then((fs) =>
    fs.mkdir(dir, { recursive: true }),
  );
  await writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf-8");
}

async function getArtistSongs(artistId: number): Promise<ArtistInput | null> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: { id: true, name: true },
  });

  if (!artist) return null;

  const songs = await prisma.song.findMany({
    where: {
      artistSongs: { some: { artistId } },
    },
    select: {
      id: true,
      title: true,
      titleJa: true,
      titleLatin: true,
    },
    orderBy: { id: "asc" },
  });

  return {
    artistId: artist.id,
    artistName: artist.name,
    songs: songs.map((s) => ({
      songId: s.id,
      title: s.title,
      titleJa: s.titleJa ?? undefined,
      titleLatin: s.titleLatin ?? undefined,
    })),
  };
}

async function processArtist(
  artistId: number,
  pendingFixes: PendingFixes,
): Promise<boolean> {
  console.log(`\nArtist ${artistId} 확인 중...`);

  try {
    const artistInput = await getArtistSongs(artistId);

    if (!artistInput) {
      console.log(`  → 아티스트 없음, 스킵`);
      return false;
    }

    if (artistInput.songs.length === 0) {
      console.log(`  → 곡 없음, 스킵`);
      return false;
    }

    console.log(
      `  → ${artistInput.artistName}: ${artistInput.songs.length}개 곡`,
    );

    // 곡이 너무 많으면 나눠서 처리
    const chunks: SongInput[][] = [];
    for (let i = 0; i < artistInput.songs.length; i += BATCH_THRESHOLD) {
      chunks.push(artistInput.songs.slice(i, i + BATCH_THRESHOLD));
    }

    const allFixes: SongFix[] = [];

    for (let i = 0; i < chunks.length; i++) {
      if (chunks.length > 1) {
        console.log(`  → 청크 ${i + 1}/${chunks.length} 처리 중...`);
      }
      console.log(`  → GPT 호출 중...`);

      const fixes = await callGPT({
        ...artistInput,
        songs: chunks[i],
      });

      allFixes.push(...fixes);

      if (i < chunks.length - 1) {
        await sleep(2000);
      }
    }

    if (allFixes.length === 0) {
      console.log(`  → 수정 필요 없음`);
      return true;
    }

    console.log(`  → ${allFixes.length}개 수정 필요 → JSON에 저장`);

    // 기존 결과에서 같은 artistId가 있으면 교체
    const existingIndex = pendingFixes.results.findIndex(
      (r) => r.artistId === artistId,
    );
    const artistFix: ArtistFix = {
      artistId,
      artistName: artistInput.artistName,
      fixes: allFixes,
    };

    if (existingIndex >= 0) {
      pendingFixes.results[existingIndex] = artistFix;
    } else {
      pendingFixes.results.push(artistFix);
    }

    await savePendingFixes(pendingFixes);
    return true;
  } catch (error) {
    console.error(`  → 오류 발생:`, error);
    return false;
  }
}

async function main() {
  const startId = Number(process.argv[2]) || 1;
  const endId = Number(process.argv[3]) || 272;

  console.log(`타이틀 검증 시작: Artist ${startId} ~ ${endId}`);
  console.log(`결과 저장 위치: ${OUTPUT_FILE}`);

  const pendingFixes = await loadPendingFixes();

  for (let artistId = startId; artistId <= endId; artistId++) {
    const calledAI = await processArtist(artistId, pendingFixes);

    if (artistId < endId) {
      if (calledAI) {
        console.log(`  → 3초 대기...`);
        await sleep(3000);
      } else {
        await sleep(100);
      }
    }
  }

  const totalFixes = pendingFixes.results.reduce(
    (sum, r) => sum + r.fixes.length,
    0,
  );
  console.log(`\n========== 검증 완료 ==========`);
  console.log(
    `총 ${pendingFixes.results.length}개 아티스트, ${totalFixes}개 수정 대기 중`,
  );
  console.log(`적용하려면: pnpm stc:apply`);
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
