import "dotenv/config";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { disconnect } from "../../prisma.js";
import { getUnmappedData, type MappingPayload, type UnmappedData } from "../../tools/song-mapper.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const OUTPUT_FILE = path.join(__dirname, "../../../output/song-youtube-link/pending-mappings.json");
const BATCH_THRESHOLD = 50;

const SYSTEM_PROMPT = `Return ONLY valid JSON array. No markdown. No extra text.`;

const DEVELOPER_PROMPT = `Output schema: Array<{artistId: number, artistName: string, song: Array<{songId:number, songTitle:string, videoId:string, videoName:string}>}>. Do not add unknown fields.

Map only when you can match confidently. Otherwise omit the item.`;

interface ArtistInput {
  artistId: number;
  artistName: string;
  songs: Array<{ songId: number; songTitle: string }>;
  youtubeVideos: Array<{ videoId: string; videoTitle: string }>;
}

function buildUserPrompt(artists: ArtistInput[]): string {
  const inputJson = JSON.stringify(artists);
  return `Input: ${inputJson}. Produce output in the schema.

입력 JSON 배열에서 각 아티스트별로 songTitle ↔ videoTitle을 매핑해, 지정한 출력 JSON 스키마 그대로 반환해라(형식 변경 금지).

<출력 강제포맷>
[
  {
    "artistId": 74,
    "artistName": "BUMP OF CHICKEN",
    "song": [
      {
        "songId": 10016,
        "songTitle": "アカシア",
        "videoId": "4dnT-kKIO6Y",
        "videoName": "Acacia"
      }
    ]
  }
]

매핑은 간단한 유튜브 검색으로 2차 검증 통과한 것만 포함해라. (title을 검색해서 어떤 유튜브 비디오가 나오는지 확인.)
검색했을때 나오지 않으면 아예 매핑하지 말고 제외해라.
너무 깊게 생각하지 않고 당연한것은 당연하게 검색 안해도됌. 직관적으로 봤을때 모르겠는것만 검색 ㄱㄱ
videoId를 통해 검색을 하는건 아니고 videoId는 그냥 리턴json에 넣기위함임.
매핑된 곡이 없는 아티스트는 결과 배열에서 제외해도 됨.

⚠️⚠️⚠️ 절대 지켜야 할 규칙 (위반시 결과 무효) ⚠️⚠️⚠️

1. songId 중복 금지: 같은 songId를 결과에 2번 이상 쓰면 안 된다.
2. videoId 중복 금지: 같은 videoId를 결과에 2번 이상 쓰면 안 된다.
3. 1:1 매핑만 허용: 한 곡에 한 영상, 한 영상에 한 곡만 연결한다.
4. 확실한 것만: 곡 제목과 영상 제목이 명확히 일치할 때만 매핑한다. 애매하면 매핑하지 마라.
5. 메들리/라이브/컴필레이션 영상은 절대 매핑하지 마라.

틀리면 차라리 빈 배열 []을 반환해라. 잘못된 매핑보다 없는 게 낫다.`;
}

async function callGPT(artists: ArtistInput[]): Promise<MappingPayload[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "developer", content: DEVELOPER_PROMPT },
        { role: "user", content: buildUserPrompt(artists) },
      ],
      temperature: 0,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      console.error("GPT 응답 없음");
      return [];
    }

    console.log(`  → GPT 응답: ${content.slice(0, 200)}${content.length > 200 ? "..." : ""}`);

    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    console.error("GPT 호출 실패:", error);
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PendingMappings {
  createdAt: string;
  results: MappingPayload[];
}

async function loadPendingMappings(): Promise<PendingMappings> {
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

async function savePendingMappings(data: PendingMappings): Promise<void> {
  const dir = path.dirname(OUTPUT_FILE);
  await import("node:fs/promises").then((fs) => fs.mkdir(dir, { recursive: true }));
  await writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function toArtistInput(data: UnmappedData): ArtistInput {
  // 유튜브 비디오 이름 중복 제거 (조회수 높은 것만 유지)
  const videoMap = new Map<string, { videoId: string; videoTitle: string; viewCount: number }>();
  for (const v of data.youtubeVideos) {
    const existing = videoMap.get(v.videoTitle);
    const viewCount = v.viewCount ?? 0;
    if (!existing || viewCount > existing.viewCount) {
      videoMap.set(v.videoTitle, { videoId: v.videoId, videoTitle: v.videoTitle, viewCount });
    }
  }

  return {
    artistId: data.artistId,
    artistName: data.name,
    songs: data.songs.map((s) => ({
      songId: s.id,
      songTitle: s.title,
    })),
    youtubeVideos: Array.from(videoMap.values()).map((v) => ({
      videoId: v.videoId,
      videoTitle: v.videoTitle,
    })),
  };
}

function getItemCount(artist: ArtistInput): number {
  return artist.songs.length + artist.youtubeVideos.length;
}

/**
 * 결과 검증 및 정제
 * - songId 중복 제거 (첫 번째만 유지)
 * - videoId가 3개 이상 중복되면 해당 아티스트 결과 제외
 */
function validateAndCleanResult(result: MappingPayload): MappingPayload | null {
  // videoId 중복 횟수 체크
  const videoIdCount = new Map<string, number>();
  for (const item of result.song) {
    videoIdCount.set(item.videoId, (videoIdCount.get(item.videoId) ?? 0) + 1);
  }

  // 같은 videoId가 3개 이상이면 해당 아티스트 결과 제외
  for (const [videoId, count] of videoIdCount) {
    if (count >= 3) {
      console.log(`  ⚠️ Artist ${result.artistId}: videoId "${videoId}"가 ${count}개 곡에 중복 → 결과 제외`);
      return null;
    }
  }

  // songId 중복 제거 (첫 번째만 유지)
  const seenSongIds = new Set<number>();
  const seenVideoIds = new Set<string>();
  const cleanedSongs = result.song.filter((item) => {
    if (seenSongIds.has(item.songId)) {
      console.log(`  ⚠️ Artist ${result.artistId}: songId ${item.songId} 중복 제거`);
      return false;
    }
    if (seenVideoIds.has(item.videoId)) {
      console.log(`  ⚠️ Artist ${result.artistId}: videoId "${item.videoId}" 중복 제거`);
      return false;
    }
    seenSongIds.add(item.songId);
    seenVideoIds.add(item.videoId);
    return true;
  });

  return {
    ...result,
    song: cleanedSongs,
  };
}

async function processBatch(
  batch: ArtistInput[],
  pendingMappings: PendingMappings
): Promise<void> {
  if (batch.length === 0) return;

  const totalItems = batch.reduce((sum, a) => sum + getItemCount(a), 0);
  const artistIds = batch.map((a) => a.artistId).join(", ");
  console.log(`\n========== 배치 처리: Artist [${artistIds}] (${totalItems}개 항목) ==========`);
  console.log(`  → GPT 호출 중...`);

  const results = await callGPT(batch);

  if (results.length === 0) {
    console.log(`  → 매핑 결과 없음`);
    return;
  }

  let totalMapped = 0;
  for (const rawResult of results) {
    if (rawResult.song.length === 0) continue;

    // 결과 검증 및 정제
    const result = validateAndCleanResult(rawResult);
    if (!result || result.song.length === 0) continue;

    totalMapped += result.song.length;

    const existingIndex = pendingMappings.results.findIndex(
      (r) => r.artistId === result.artistId
    );
    if (existingIndex >= 0) {
      pendingMappings.results[existingIndex] = result;
    } else {
      pendingMappings.results.push(result);
    }
  }

  console.log(`  → GPT 매핑 결과: ${totalMapped}개 → JSON에 저장`);
  await savePendingMappings(pendingMappings);
}

async function main() {
  const startId = Number(process.argv[2]) || 1;
  const endId = Number(process.argv[3]) || 272;

  console.log(`배치 매핑 시작: Artist ${startId} ~ ${endId}`);
  console.log(`결과 저장 위치: ${OUTPUT_FILE}`);
  console.log(`배치 임계값: ${BATCH_THRESHOLD}개 항목`);

  const pendingMappings = await loadPendingMappings();

  let currentBatch: ArtistInput[] = [];
  let currentItemCount = 0;

  for (let artistId = startId; artistId <= endId; artistId++) {
    console.log(`\nArtist ${artistId} 확인 중...`);

    try {
      const unmappedData = await getUnmappedData(artistId);

      if (unmappedData.songs.length === 0) {
        console.log(`  → 매핑 안된 곡 없음, 스킵`);
        await sleep(100);
        continue;
      }

      if (unmappedData.youtubeVideos.length === 0) {
        console.log(`  → 조회수 100만+ 영상 없음, 스킵`);
        await sleep(100);
        continue;
      }

      const artistInput = toArtistInput(unmappedData);
      const itemCount = getItemCount(artistInput);
      console.log(`  → 곡 ${unmappedData.songs.length}개, 영상 ${unmappedData.youtubeVideos.length}개 → 배치에 추가`);

      currentBatch.push(artistInput);
      currentItemCount += itemCount;

      // 임계값 초과하면 배치 처리
      if (currentItemCount > BATCH_THRESHOLD) {
        await processBatch(currentBatch, pendingMappings);
        currentBatch = [];
        currentItemCount = 0;
        console.log(`  → 5초 대기...`);
        await sleep(5000);
      }
    } catch (error) {
      console.error(`  → 오류 발생:`, error);
    }
  }

  // 남은 배치 처리
  if (currentBatch.length > 0) {
    await processBatch(currentBatch, pendingMappings);
  }

  const totalMappings = pendingMappings.results.reduce(
    (sum, r) => sum + r.song.length,
    0
  );
  console.log(`\n========== 배치 완료 ==========`);
  console.log(`총 ${pendingMappings.results.length}개 아티스트, ${totalMappings}개 매핑 대기 중`);
  console.log(`적용하려면: pnpm apply`);
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await disconnect();
  });
