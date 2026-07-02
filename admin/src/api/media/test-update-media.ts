/**
 * updateYoutubeChannel / updateSpotifyArtist 동작 확인용 수동 테스트.
 *
 * Usage:
 * cd admin
 * pnpm tsx src/api/media/test-update-media.ts
 *
 * channelId, artistId 값을 바꿔가며 실행.
 */
import "dotenv/config";
import { updateSpotifyArtist } from "./spotify-update";
import { updateYoutubeChannel } from "./youtube-update";

const channelId = "UCbqY3RHKkPS8dJCrfAfSk6Q"; // Ayase - Topic
const artistId = "07YUOmWljBTXwIseAUd9TW"; // Sebastian Yatra

async function main() {
  const youtubeResult = await updateYoutubeChannel(channelId);
  console.log("youtube:", JSON.stringify(youtubeResult, null, 2));

  const spotifyResult = await updateSpotifyArtist(artistId);
  console.log("spotify:", JSON.stringify(spotifyResult, null, 2));
}

void main();
