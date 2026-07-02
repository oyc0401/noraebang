import { ApiProperty } from "@nestjs/swagger";

export class SpotifyTrackCandidateDto {
  @ApiProperty({ description: "spotify_track.id", example: "7yq4Qj7cqayVTp3FF9CWbm" })
  id: string;

  @ApiProperty({ example: "マリーゴールド" })
  name: string;

  @ApiProperty({ required: false, nullable: true, example: "JPU301701294" })
  isrc: string | null;

  @ApiProperty({ required: false, nullable: true, example: 296493 })
  durationMs: number | null;

  @ApiProperty({ required: false, nullable: true, example: "2018-08-08" })
  releaseDate: string | null;

  @ApiProperty({ type: [String], example: ["https://i.scdn.co/image/..."] })
  albumImages: string[];
}

export class YoutubeVideoCandidateDto {
  @ApiProperty({ description: "youtube_video.id", example: "0xSiBpUdW4E" })
  id: string;

  @ApiProperty({ required: false, nullable: true, example: "UC..." })
  channelId: string | null;

  @ApiProperty({ example: "あいみょん - マリーゴールド【OFFICIAL MUSIC VIDEO】" })
  title: string;

  @ApiProperty({ required: false, nullable: true })
  publishedAt: Date | null;

  @ApiProperty({ required: false, nullable: true, example: "https://i.ytimg.com/vi/.../default.jpg" })
  thumbnailDefault: string | null;

  @ApiProperty({ required: false, nullable: true, example: "https://i.ytimg.com/vi/.../mqdefault.jpg" })
  thumbnailMedium: string | null;

  @ApiProperty({ required: false, nullable: true, example: "https://i.ytimg.com/vi/.../hqdefault.jpg" })
  thumbnailHigh: string | null;

  @ApiProperty({ required: false, nullable: true, example: "12345678" })
  viewCount: string | null;

  @ApiProperty({ required: false, nullable: true, example: "123456" })
  likeCount: string | null;
}

export class SongMediaCandidatesResponseDto {
  @ApiProperty({ required: false, nullable: true, example: "マリーゴールド" })
  titleJa: string | null;

  @ApiProperty({ required: false, nullable: true, example: "Marigold" })
  titleLatin: string | null;

  @ApiProperty({ type: [SpotifyTrackCandidateDto] })
  spotifyTracks: SpotifyTrackCandidateDto[];

  @ApiProperty({ type: [YoutubeVideoCandidateDto] })
  youtubeVideos: YoutubeVideoCandidateDto[];
}
