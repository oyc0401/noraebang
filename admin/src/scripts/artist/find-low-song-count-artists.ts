import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import pg from "pg";

// TJ에서 곡 개수가 적은 가수들의 노래에 매핑된 Artist 중에서 곡 개수가 적은 Artist를 삭제하는 스크립트
//
// 실행 흐름:
// 1. TjSong에서 artistList 기준으로 곡 개수가 2개 이하인 가수들을 찾음
// 2. 그 가수들이 포함된 TjSong의 노래방번호(id)를 조회
// 3. KaraokeSong 테이블에서 해당 노래방번호와 매핑된 Song을 찾음
// 4. 그 Song들의 Artist 중에서 전체 곡 개수가 2개 이하인 Artist를 조회
// 5. --force 옵션이 있으면 해당 Artist들을 삭제 (기본은 dry-run)
//
// 주의: Artist 삭제 시 ArtistSong, YoutubeChannel도 함께 삭제됨 (Cascade)
//       Song은 남아있지만 주인 없는 곡이 될 수 있음
//
// pnpm ts-node src/scripts/artist/find-low-song-count-artists.ts (dry-run, 조회만)
// pnpm ts-node src/scripts/artist/find-low-song-count-artists.ts --force (실제 삭제)
// pnpm ts-node src/scripts/artist/find-low-song-count-artists.ts --limit=100
// pnpm ts-node src/scripts/artist/find-low-song-count-artists.ts --threshold=3
// pnpm ts-node src/scripts/artist/find-low-song-count-artists.ts --force --threshold=3

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const isForce = process.argv.includes("--force");
  const isDryRun = !isForce; // 기본은 dry-run
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1]) : 50;
  const thresholdArg = process.argv.find((arg) =>
    arg.startsWith("--threshold="),
  );
  const threshold = thresholdArg
    ? Number.parseInt(thresholdArg.split("=")[1])
    : 2;

  console.log("🔍 TJ 소곡 가수 -> Song -> 소곡 Artist 삭제");
  console.log(`📊 곡 개수 임계값: ${threshold}개 이하`);
  console.log(`📋 출력 개수: ${limit}명`);
  if (isDryRun) {
    console.log("🔍 DRY RUN 모드 (조회만, 삭제 안함)");
  } else {
    console.log("⚠️  FORCE 모드 (실제 삭제 실행!)");
  }
  console.log("");

  if (isDryRun) {
    console.log(
      "ℹ️  조회만 수행합니다. 실제 삭제하려면 --force 옵션을 사용하세요.",
    );
    console.log("");
  }

  // Step 1: TjSong에서 곡 개수가 threshold 이하인 가수들이 포함된 노래의 노래방번호 찾기
  console.log(
    `Step 1: TjSong에서 곡 개수 ${threshold}개 이하인 가수들이 포함된 노래 조회 중...`,
  );

  const tjSongsWithLowCountArtists = await prisma.$queryRaw<
    Array<{ tj_song_id: string; low_count_artists: string[] }>
  >`
    WITH artist_counts AS (
      SELECT
        artist,
        COUNT(*) as song_count
      FROM (
        SELECT UNNEST(artist_list) as artist
        FROM tj_song
      ) as all_artists
      GROUP BY artist
      HAVING COUNT(*) <= ${threshold}
    )
    SELECT
      ts.id as tj_song_id,
      ARRAY_AGG(DISTINCT ac.artist) as low_count_artists
    FROM tj_song ts
    CROSS JOIN UNNEST(ts.artist_list) as artist_name
    INNER JOIN artist_counts ac ON ac.artist = artist_name
    GROUP BY ts.id
  `;

  console.log(
    `  ✅ ${tjSongsWithLowCountArtists.length.toLocaleString()}개의 TJ 노래 발견`,
  );
  console.log("");

  // Step 2: KaraokeSong을 통해 Song 찾기
  console.log("Step 2: KaraokeSong 테이블을 통해 매핑된 Song 조회 중...");

  const tjSongIds = tjSongsWithLowCountArtists.map((ts) => ts.tj_song_id);

  const karaokeSongs = await prisma.karaokeSong.findMany({
    where: {
      provider: "TJ",
      karaokeNo: {
        in: tjSongIds,
      },
    },
    select: {
      karaokeNo: true,
      songId: true,
    },
  });

  console.log(
    `  ✅ ${karaokeSongs.length.toLocaleString()}개의 매핑된 Song 발견`,
  );
  console.log("");

  // Step 3: 그 Song들의 Artist 중에서 곡 개수가 threshold 이하인 Artist 찾기
  console.log(
    `Step 3: Song의 Artist 중 곡 개수 ${threshold}개 이하인 Artist 조회 중...`,
  );

  const songIds = [...new Set(karaokeSongs.map((ks) => ks.songId))];

  const artistsWithLowSongCount = await prisma.$queryRaw<
    Array<{
      artist_id: number;
      artist_name: string;
      artist_name_ko: string;
      song_count: bigint;
      tj_artists: string[];
    }>
  >`
    WITH song_artist_counts AS (
      SELECT
        a.id as artist_id,
        a.name as artist_name,
        a.name_ko as artist_name_ko,
        COUNT(DISTINCT as2.song_id) as song_count
      FROM artist a
      INNER JOIN artist_song as2 ON a.id = as2.artist_id
      GROUP BY a.id, a.name, a.name_ko
      HAVING COUNT(DISTINCT as2.song_id) <= ${threshold}
    ),
    relevant_artists AS (
      SELECT DISTINCT
        sac.artist_id,
        sac.artist_name,
        sac.artist_name_ko,
        sac.song_count,
        as2.song_id
      FROM song_artist_counts sac
      INNER JOIN artist_song as2 ON sac.artist_id = as2.artist_id
      WHERE as2.song_id = ANY(${songIds}::int[])
    ),
    tj_mapping AS (
      SELECT
        ra.artist_id,
        ra.artist_name,
        ra.artist_name_ko,
        ra.song_count,
        ARRAY_AGG(DISTINCT tla.artist) as tj_artists
      FROM relevant_artists ra
      INNER JOIN artist_song as2 ON ra.artist_id = as2.artist_id
      INNER JOIN karaoke_song ks ON as2.song_id = ks.song_id AND ks.provider = 'TJ'
      CROSS JOIN LATERAL (
        SELECT UNNEST(ts.artist_list) as artist
        FROM tj_song ts
        WHERE ts.id = ks.karaoke_no
      ) tla
      GROUP BY ra.artist_id, ra.artist_name, ra.artist_name_ko, ra.song_count
    )
    SELECT
      artist_id,
      artist_name,
      artist_name_ko,
      song_count,
      tj_artists
    FROM tj_mapping
    ORDER BY song_count DESC, artist_name ASC
  `;

  console.log(
    `  ✅ ${artistsWithLowSongCount.length.toLocaleString()}명의 Artist 발견`,
  );
  console.log("");

  if (artistsWithLowSongCount.length === 0) {
    console.log("ℹ️  삭제할 Artist가 없습니다.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  // 결과 출력
  console.log(`🏆 곡 개수 ${threshold}개 이하인 Artist (상위 ${limit}명):`);
  console.log("");

  artistsWithLowSongCount.slice(0, limit).forEach((artist, i) => {
    const count = Number(artist.song_count);
    const tjArtists = artist.tj_artists.join(", ");
    console.log(
      `  ${(i + 1).toString().padStart(3)}. [${count}곡] ${artist.artist_name_ko} (${artist.artist_name})`,
    );
    console.log(`       Artist ID: ${artist.artist_id}`);
    console.log(`       TJ 가수명: ${tjArtists}`);
    console.log("");
  });

  if (isDryRun) {
    console.log("✨ 조회 완료 (DRY RUN)");
    console.log("");
    console.log("📈 통계:");
    console.log(
      `  - TJ 소곡 가수 포함 노래: ${tjSongsWithLowCountArtists.length.toLocaleString()}개`,
    );
    console.log(`  - 매핑된 Song: ${karaokeSongs.length.toLocaleString()}개`);
    console.log(
      `  - 곡 개수 ${threshold}개 이하인 Artist: ${artistsWithLowSongCount.length.toLocaleString()}명`,
    );
    console.log("");
    console.log(
      `💡 실제로 삭제하려면 --force 옵션을 사용하세요: pnpm ts-node src/scripts/artist/find-low-song-count-artists.ts --force`,
    );
  } else {
    // 실제 삭제 실행
    console.log("🗑️  Artist 삭제 중...");
    console.log("");

    const artistIds = artistsWithLowSongCount.map((a) => a.artist_id);

    const deleteResult = await prisma.artist.deleteMany({
      where: {
        id: {
          in: artistIds,
        },
      },
    });

    console.log(
      `✅ ${deleteResult.count.toLocaleString()}명의 Artist 삭제 완료`,
    );
    console.log("");
    console.log("📈 통계:");
    console.log(
      `  - TJ 소곡 가수 포함 노래: ${tjSongsWithLowCountArtists.length.toLocaleString()}개`,
    );
    console.log(`  - 매핑된 Song: ${karaokeSongs.length.toLocaleString()}개`);
    console.log(`  - 삭제된 Artist: ${deleteResult.count.toLocaleString()}명`);
    console.log("");
    console.log(
      "⚠️  주의: 삭제된 Artist와 연결된 ArtistSong, YoutubeChannel도 함께 삭제되었습니다.",
    );
    console.log("⚠️  주의: 일부 Song은 주인 없는 곡이 되었을 수 있습니다.");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
