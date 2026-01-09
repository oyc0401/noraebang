// npx tsx src/scripts/spotify/getArtistTracks.ts

/**
 * Spotify API로 아티스트의 모든 곡을 가져오는 스크립트
 * 아티스트 ID를 입력하면 해당 아티스트의 모든 앨범과 트랙을 출력합니다.
 */

const SPOTIFY_CLIENT_ID = "06d2db914d8b47b9a8d4642bc7352d16";
const SPOTIFY_CLIENT_SECRET = "dfd5e0c5507d443eb7f2c29f9571e21d";

// 여기에 아티스트 ID를 입력하세요
const ARTIST_ID = "1Y5vJqABeI6QI6R95EDV6o";

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  release_date: string;
  total_tracks: number;
  album_type: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  track_number: number;
  duration_ms: number;
}

async function getSpotifyToken(): Promise<string> {
  console.log("Getting Spotify access token...");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString(
          "base64",
        ),
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`Failed to get token: ${res.status} ${res.statusText}`);
  }

  const data: SpotifyTokenResponse = await res.json();
  console.log("✅ Token acquired\n");
  return data.access_token;
}

async function getArtistAlbums(
  token: string,
  artistId: string,
): Promise<SpotifyAlbum[]> {
  console.log(`Fetching albums for artist ${artistId}...`);

  const albums: SpotifyAlbum[] = [];
  let url = `https://api.spotify.com/v1/artists/${artistId}/albums?include_groups=album,single&limit=50`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to get albums: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    albums.push(...data.items);
    url = data.next;
  }

  console.log(`✅ Found ${albums.length} albums\n`);
  return albums;
}

async function getAlbumTracks(
  token: string,
  albumId: string,
): Promise<SpotifyTrack[]> {
  const tracks: SpotifyTrack[] = [];
  let url = `https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`;

  while (url) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to get tracks: ${res.status} ${res.statusText}`);
    }

    const data: any = await res.json();
    tracks.push(...data.items);
    url = data.next;
  }

  return tracks;
}

async function main() {
  try {
    const token = await getSpotifyToken();
    const albums = await getArtistAlbums(token, ARTIST_ID);

    console.log("=".repeat(80));
    console.log(`Artist ID: ${ARTIST_ID}`);
    console.log(`Total Albums: ${albums.length}`);
    console.log("=".repeat(80) + "\n");

    let totalTracks = 0;

    for (const album of albums) {
      console.log(`📀 ${album.name}`);
      console.log(
        `   Type: ${album.album_type} | Release: ${album.release_date} | Tracks: ${album.total_tracks}`,
      );

      const tracks = await getAlbumTracks(token, album.id);
      totalTracks += tracks.length;

      for (const track of tracks) {
        const minutes = Math.floor(track.duration_ms / 60000);
        const seconds = Math.floor((track.duration_ms % 60000) / 1000);
        console.log(
          `   ${track.track_number}. ${track.name} (${minutes}:${seconds.toString().padStart(2, "0")})`,
        );
      }

      console.log("");
    }

    console.log("=".repeat(80));
    console.log(`✅ Total Tracks: ${totalTracks}`);
    console.log("=".repeat(80));
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
