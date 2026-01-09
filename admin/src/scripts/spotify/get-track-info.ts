/**
 * Spotify Track ID로 트랙 정보를 가져오는 스크립트
 *
 * 기능:
 * - Spotify Track ID로 Spotify API에서 트랙 정보 조회
 * - Raw JSON 데이터를 콘솔에 출력
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/get-track-info.ts <spotifyTrackId>
 * pnpm ts-node src/scripts/spotify/get-track-info.ts 3n3Ppam7vgaVa1iaRUc9Lp
 *
 * 주의:
 * - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET 환경변수 필요
 */

import "dotenv/config";

// Spotify Access Token 가져오기
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Spotify에서 트랙 정보 가져오기
async function getSpotifyTrack(spotifyId: string, accessToken: string): Promise<any> {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${spotifyId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get track from Spotify: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

async function main() {
  const spotifyTrackId = process.argv[2];

  if (!spotifyTrackId) {
    console.error("❌ Usage: pnpm ts-node src/scripts/spotify/get-track-info.ts <spotifyTrackId>");
    console.error("   Example: pnpm ts-node src/scripts/spotify/get-track-info.ts 3n3Ppam7vgaVa1iaRUc9Lp");
    process.exit(1);
  }

  console.log(`Fetching Spotify Track: ${spotifyTrackId}\n`);

  // Access Token 가져오기
  const accessToken = await getSpotifyAccessToken();

  // 트랙 정보 가져오기
  const trackData = await getSpotifyTrack(spotifyTrackId, accessToken);

  // Raw JSON 출력
  console.log(JSON.stringify(trackData, null, 2));
}

main().catch((error) => {
  console.error("\n❌ 오류 발생:", error.message);
  process.exit(1);
});
