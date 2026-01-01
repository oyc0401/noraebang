import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// TJ DB에서 아티스트를 읽어 Spotify API로 검색하여 Artist 테이블에 저장
// pnpm ts-node src/scripts/spotify/import-artists-from-tj.ts
// pnpm ts-node src/scripts/spotify/import-artists-from-tj.ts --min-songs=3 --min-followers=1000
// pnpm ts-node src/scripts/spotify/import-artists-from-tj.ts --dry-run

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SpotifyArtist {
  id: string;
  name: string;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  genres: string[];
  popularity: number;
}

interface SpotifySearchResponse {
  artists: {
    items: SpotifyArtist[];
  };
}

/**
 * Spotify Access Token 가져오기 (Client Credentials Flow)
 */
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set');
  }

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get Spotify access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Spotify에서 아티스트 검색
 */
async function searchSpotifyArtist(
  artistName: string,
  accessToken: string,
): Promise<SpotifyArtist | null> {
  const query = encodeURIComponent(artistName);
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=artist&limit=5`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    console.error(
      `Failed to search artist "${artistName}": ${response.statusText}`,
    );
    return null;
  }

  const data: SpotifySearchResponse = await response.json();
  const items = data.artists.items;

  if (items.length === 0) {
    return null;
  }

  // 정확히 일치하는 이름 찾기 (대소문자 무시)
  const exactMatch = items.find(
    (artist) => artist.name.toLowerCase() === artistName.toLowerCase(),
  );

  if (exactMatch) {
    return exactMatch;
  }

  // 정확히 일치하지 않으면 첫 번째 결과 반환 (신뢰도 낮음)
  return items[0];
}

async function main() {
  // 최소 곡 수 필터
  const minSongsArg = process.argv.find((arg) => arg.startsWith('--min-songs='));
  const minSongs = minSongsArg ? parseInt(minSongsArg.split('=')[1]) : 3;

  // 최소 팔로워 수 필터
  const minFollowersArg = process.argv.find((arg) =>
    arg.startsWith('--min-followers='),
  );
  const minFollowers = minFollowersArg
    ? parseInt(minFollowersArg.split('=')[1])
    : 1000;

  // Dry-run 모드
  const dryRun = process.argv.includes('--dry-run');

  console.log('🎵 Spotify 아티스트 임포트 시작');
  console.log(`🔢 최소 곡 수: ${minSongs}곡`);
  console.log(`👥 최소 팔로워: ${minFollowers.toLocaleString()}명`);
  if (dryRun) {
    console.log('🔍 Dry-run 모드: 실제로 저장하지 않음');
  }
  console.log('');

  // TJ DB에서 모든 곡 가져오기
  console.log('📊 TJ DB에서 곡 데이터 로딩 중...');
  const tjSongs = await prisma.tjSong.findMany({
    select: {
      artistList: true,
      featureList: true,
      producerList: true,
    },
  });

  // 아티스트 집계
  const artistCounts = new Map<string, number>();

  for (const song of tjSongs) {
    const allArtists = [
      ...song.artistList,
      ...song.featureList,
      ...song.producerList,
    ];

    for (const artist of allArtists) {
      artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
    }
  }

  // 최소 곡 수 필터 적용
  const artists = Array.from(artistCounts.entries())
    .filter(([_, count]) => count >= minSongs)
    .map(([name, count]) => ({ name, songCount: count }))
    .sort((a, b) => b.songCount - a.songCount || a.name.localeCompare(b.name));

  console.log(
    `✅ 총 ${artists.length.toLocaleString()}명의 아티스트 (${minSongs}곡 이상)`,
  );
  console.log('');

  // Spotify Access Token 가져오기
  console.log('🔑 Spotify Access Token 가져오는 중...');
  const accessToken = await getSpotifyAccessToken();
  console.log('✅ Access Token 획득 완료');
  console.log('');

  // 결과 통계
  const stats = {
    total: artists.length,
    matched: 0,
    notFound: 0,
    lowFollowers: 0,
    alreadyExists: 0,
    saved: 0,
  };

  const notFoundList: string[] = [];
  const lowFollowersList: Array<{ name: string; followers: number }> = [];

  // 아티스트 검색 및 저장
  for (let i = 0; i < artists.length; i++) {
    const { name, songCount } = artists[i];

    // 진행상황 출력 (매 10명마다)
    if (i % 10 === 0) {
      console.log(
        `[${i + 1}/${artists.length}] 처리 중... (매칭: ${stats.matched}, 저장: ${stats.saved})`,
      );
    }

    // Spotify에서 검색
    const spotifyArtist = await searchSpotifyArtist(name, accessToken);

    if (!spotifyArtist) {
      stats.notFound++;
      notFoundList.push(name);
      continue;
    }

    stats.matched++;

    // 팔로워 수 필터
    if (spotifyArtist.followers.total < minFollowers) {
      stats.lowFollowers++;
      lowFollowersList.push({
        name: spotifyArtist.name,
        followers: spotifyArtist.followers.total,
      });
      continue;
    }

    // DB에 이미 존재하는지 확인
    const existing = await prisma.artist.findUnique({
      where: { spotifyId: spotifyArtist.id },
    });

    if (existing) {
      stats.alreadyExists++;
      continue;
    }

    // DB에 저장
    if (dryRun) {
      // Dry-run 모드: 실제로 저장하지 않음
      console.log(
        `  [DRY-RUN] Would save: ${spotifyArtist.name} (${spotifyArtist.followers.total.toLocaleString()} followers)`,
      );
      stats.saved++;
    } else {
      // 실제 저장
      try {
        await prisma.artist.create({
          data: {
            name: spotifyArtist.name,
            spotifyId: spotifyArtist.id,
            imageUrl: spotifyArtist.images[0]?.url || null,
            followers: spotifyArtist.followers.total,
            popularity: spotifyArtist.popularity,
            genres: spotifyArtist.genres,
          },
        });
        stats.saved++;
      } catch (error) {
        console.error(`Failed to save artist "${spotifyArtist.name}":`, error);
      }
    }

    // Rate limiting 방지 (100ms 대기)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log('');
  console.log('✅ 임포트 완료!');
  console.log('');
  console.log('📊 결과:');
  console.log(`  총 처리: ${stats.total.toLocaleString()}명`);
  console.log(`  매칭 성공: ${stats.matched.toLocaleString()}명`);
  console.log(`  매칭 실패: ${stats.notFound.toLocaleString()}명`);
  console.log(`  팔로워 부족: ${stats.lowFollowers.toLocaleString()}명`);
  console.log(`  이미 존재: ${stats.alreadyExists.toLocaleString()}명`);
  console.log(`  새로 저장: ${stats.saved.toLocaleString()}명`);
  console.log('');

  // 매칭 실패한 아티스트 로그 저장
  if (notFoundList.length > 0) {
    const logPath = path.join(
      __dirname,
      '../../../data/spotify_not_found.txt',
    );
    fs.writeFileSync(logPath, notFoundList.join('\n'), 'utf-8');
    console.log(`❌ 매칭 실패 아티스트 로그: ${logPath}`);
  }

  // 팔로워 부족 아티스트 로그 저장
  if (lowFollowersList.length > 0) {
    const logPath = path.join(
      __dirname,
      '../../../data/spotify_low_followers.txt',
    );
    const content = lowFollowersList
      .map((a) => `${a.name} (${a.followers.toLocaleString()}명)`)
      .join('\n');
    fs.writeFileSync(logPath, content, 'utf-8');
    console.log(`👥 팔로워 부족 아티스트 로그: ${logPath}`);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
