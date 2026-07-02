import { ApiProperty } from "@nestjs/swagger";

export class QueueYoutubeVideoDto {
  @ApiProperty({ description: "youtube_video.id", example: "0xSiBpUdW4E" })
  id: string;

  @ApiProperty({ example: "あいみょん - マリーゴールド【OFFICIAL MUSIC VIDEO】" })
  title: string;

  @ApiProperty({ required: false, nullable: true, example: "https://i.ytimg.com/vi/.../mqdefault.jpg" })
  thumbnailMedium: string | null;

  @ApiProperty({ required: false, nullable: true, example: "12345678" })
  viewCount: string | null;
}

export class QueueSpotifyTrackDto {
  @ApiProperty({ description: "spotify_track.id", example: "7yq4Qj7cqayVTp3FF9CWbm" })
  id: string;

  @ApiProperty({ example: "マリーゴールド" })
  name: string;

  @ApiProperty({ required: false, nullable: true, example: "2018-08-08" })
  releaseDate: string | null;

  @ApiProperty({ required: false, nullable: true, example: "https://i.scdn.co/image/..." })
  albumImage: string | null;
}

export class SongCreationQueueItemDto {
  @ApiProperty({ description: "song_creation_queue.id: 곡 생성 큐 항목 ID", example: 1 })
  id: number;

  @ApiProperty({ description: "tj_song.id: TJ 노래방 번호", required: false, example: "28397" })
  tjSongId?: string;

  @ApiProperty({ required: false, example: "JPOP" })
  catalog?: string;

  @ApiProperty({ example: "マリーゴールド" })
  title: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleKo?: string;

  @ApiProperty({ required: false, example: "マリーゴールド" })
  titleJa?: string;

  @ApiProperty({ required: false, example: "마리-고-루도" })
  titleJaPronu?: string;

  @ApiProperty({ required: false, example: "まりーごーるど" })
  titleJaKana?: string;

  @ApiProperty({ required: false, example: "金盞花" })
  titleJaKanji?: string;

  @ApiProperty({ required: false, example: "Marigold" })
  titleLatin?: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleLatinPronu?: string;

  @ApiProperty({ required: false, example: "マリーゴールド" })
  tjTitle?: string;

  @ApiProperty({ required: false, example: "あいみょん" })
  tjArtist?: string;

  @ApiProperty({
    description: "선택된 유튜브 영상 목록 (곡 하나에 여러개 가능, 표시용 제목 포함)",
    type: [QueueYoutubeVideoDto],
  })
  youtubeVideos: QueueYoutubeVideoDto[];

  @ApiProperty({
    description: "선택된 스포티파이 트랙 목록 (곡 하나에 여러개 가능, 표시용 이름 포함)",
    type: [QueueSpotifyTrackDto],
  })
  spotifyTracks: QueueSpotifyTrackDto[];

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string;

  @ApiProperty({ description: "song_artist_queue에서 매칭된 아티스트 ID", required: false, example: 140 })
  artistId?: number;

  @ApiProperty({ description: "매칭된 아티스트 이름", required: false, example: "あいみょん" })
  artistName?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
