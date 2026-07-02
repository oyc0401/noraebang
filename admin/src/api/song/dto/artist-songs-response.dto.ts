import { ApiProperty } from "@nestjs/swagger";

export class SongYoutubeVideoDto {
  @ApiProperty({ description: "youtube_video.id", example: "0xSiBpUdW4E" })
  id: string;

  @ApiProperty({ required: false, nullable: true, description: "media db에서 조회한 영상 제목", example: "あいみょん - マリーゴールド【OFFICIAL MUSIC VIDEO】" })
  title: string | null;

  @ApiProperty({ required: false, nullable: true, example: "https://i.ytimg.com/vi/.../mqdefault.jpg" })
  thumbnailMedium: string | null;

  @ApiProperty({ required: false, nullable: true, example: "12345678" })
  viewCount: string | null;
}

export class SongSpotifyTrackDto {
  @ApiProperty({ description: "spotify_track.id", example: "7yq4Qj7cqayVTp3FF9CWbm" })
  id: string;

  @ApiProperty({ required: false, nullable: true, description: "media db에서 조회한 트랙 이름", example: "マリーゴールド" })
  name: string | null;

  @ApiProperty({ required: false, nullable: true, example: "2018-08-08" })
  releaseDate: string | null;

  @ApiProperty({ required: false, nullable: true, example: "https://i.scdn.co/image/..." })
  albumImage: string | null;
}

export class ArtistSongItemDto {
  @ApiProperty({ description: "song.id", example: 97574 })
  id: number;

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

  @ApiProperty({ required: false, example: "JPOP" })
  catalog?: string;

  @ApiProperty({ description: "tj_song.id: TJ 노래방 번호", required: false, example: "28397" })
  tjSongId?: string;

  @ApiProperty({ description: "tj_song.title: TJ 제목", required: false, example: "마리골드" })
  tjTitle?: string;

  @ApiProperty({ description: "tj_song.artist: TJ 아티스트", required: false, example: "아이묭" })
  tjArtist?: string;

  @ApiProperty({ example: true })
  visible: boolean;

  @ApiProperty({ required: false, example: 0.9 })
  score?: number;

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string;

  @ApiProperty({ description: "연결된 유튜브 영상 목록", type: [SongYoutubeVideoDto] })
  youtubeVideos: SongYoutubeVideoDto[];

  @ApiProperty({ description: "연결된 스포티파이 트랙 목록", type: [SongSpotifyTrackDto] })
  spotifyTracks: SongSpotifyTrackDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ArtistDetailDto {
  @ApiProperty({ description: "artist.id", example: 140 })
  id: number;

  @ApiProperty({ example: "あいみょん" })
  name: string;

  @ApiProperty({ example: "아이묭" })
  nameKo: string;

  @ApiProperty({ required: false, example: "あいみょん" })
  nameJa?: string;

  @ApiProperty({ required: false, example: "あいみょん" })
  nameJaKana?: string;

  @ApiProperty({ required: false, example: "아이묭" })
  nameJaPronu?: string;

  @ApiProperty({ required: false, example: "Aimyon" })
  nameLatin?: string;

  @ApiProperty({ required: false, example: "아이묜" })
  nameLatinPronu?: string;

  @ApiProperty({ required: false, example: "아이묭" })
  tjName?: string;

  @ApiProperty({ required: false, example: "aimyon" })
  slug?: string;

  @ApiProperty({ required: false, example: "JPOP" })
  homeCatalog?: string;

  @ApiProperty({ required: false, example: "UCERU7VjSJdZBKLXTQMwTXKw" })
  youtubeChannel?: string;

  @ApiProperty({ required: false, example: "UC8AJRWzKfLbjLPuMg8fM32w" })
  youtubeTopicChannel?: string;

  @ApiProperty({ required: false, example: "5faLTiZUXvXATcqDGZTaVQ" })
  spotifyId?: string;

  @ApiProperty({ required: false, example: "https://i.ytimg.com/default.jpg" })
  thumbnailDefault?: string;

  @ApiProperty({ required: false, example: "https://i.ytimg.com/medium.jpg" })
  thumbnailMedium?: string;

  @ApiProperty({ required: false, example: "https://i.ytimg.com/high.jpg" })
  thumbnailHigh?: string;
}

export class ArtistSongsResponseDto {
  @ApiProperty({ type: ArtistDetailDto })
  artist: ArtistDetailDto;

  @ApiProperty({ type: [ArtistSongItemDto] })
  data: ArtistSongItemDto[];

  @ApiProperty({ example: 12 })
  total: number;
}
