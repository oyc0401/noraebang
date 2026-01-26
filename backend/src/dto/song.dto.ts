import { ApiProperty } from "@nestjs/swagger";

export class SpotifyTrackInfoDto {
  @ApiProperty({ example: "2yLa0QULdQr0qAIvVwN6l5" })
  spotifyId: string;

  @ApiProperty({ example: "夜に駆ける" })
  name: string;

  @ApiProperty({
    example: ["https://i.scdn.co/image/ab67616d00001e02...", "https://i.scdn.co/image/ab67616d0000b273..."],
    description: "Spotify 트랙 썸네일 배열",
  })
  thumbnails: string[];

  @ApiProperty({ example: 85, required: false, description: "Spotify 인기도 (0-100)" })
  popularity?: number;

  @ApiProperty({ example: "YOASOBI", required: false, description: "Spotify 아티스트 이름" })
  artistName?: string;
}

export class YoutubeVideoInfoDto {
  @ApiProperty({ example: "x8VYWazR5mE" })
  videoId: string;

  @ApiProperty({ example: "夜に駆ける", required: false })
  title?: string;

  @ApiProperty({ example: 100000000, required: false })
  viewCount?: number;

  @ApiProperty({ example: 2020, required: false })
  publishedYear?: number;

  @ApiProperty({
    example: "https://i.ytimg.com/vi/x8VYWazR5mE/default.jpg",
    required: false,
  })
  thumbnailDefault?: string;

  @ApiProperty({
    example: "https://i.ytimg.com/vi/x8VYWazR5mE/mqdefault.jpg",
    required: false,
  })
  thumbnailMedium?: string;

  @ApiProperty({
    example: "https://i.ytimg.com/vi/x8VYWazR5mE/hqdefault.jpg",
    required: false,
  })
  thumbnailHigh?: string;

  @ApiProperty({ example: "YOASOBI", required: false, description: "YouTube 채널 이름" })
  channelName?: string;
}

export class TjSongDto {
  @ApiProperty({ example: "12345" })
  id: string;

  @ApiProperty({ example: "밤편지" })
  title: string;

  @ApiProperty({ example: "아이유", required: false })
  artist?: string;

  @ApiProperty({ example: "작사가", required: false })
  lyricist?: string;

  @ApiProperty({ example: "작곡가", required: false })
  composer?: string;

  @ApiProperty({ example: "2024-01-01", required: false })
  publishdate?: string;

  @ApiProperty({ example: false })
  isMR: boolean;

  @ApiProperty({ example: false })
  isMV: boolean;

  @ApiProperty({ example: false })
  isOver60: boolean;
}

export class BestSongProposeDto {
  @ApiProperty({ example: "YOASOBI" })
  songSinger: string;

  @ApiProperty({ example: "夜に駆ける" })
  songTitle: string;

  @ApiProperty({ example: "이 곡 정말 좋아요!" })
  content: string;

  @ApiProperty({ example: "익명" })
  name: string;

  @ApiProperty({ example: 42, description: "추천 수" })
  hit: number;

  @ApiProperty({ example: 1705123456789, description: "저장 시간 (Unix timestamp)" })
  saveDate: number;
}

export class ArtistSongDto {
  @ApiProperty({ example: 1 })
  artistId: number;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "요아소비" })
  nameKo: string;

  @ApiProperty({
    example: "MAIN",
    required: false,
    enum: ["MAIN", "FEATURING", "PRODUCER"],
  })
  role?: string;

  @ApiProperty({
    example: "yoasobi",
    required: false,
    description: "아티스트 슬러그",
  })
  slug?: string;
}

export class SongDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: "夜に駆ける" })
  title: string;

  @ApiProperty({ example: "밤을 달리다", required: false })
  titleKo?: string;

  @ApiProperty({ example: "夜に駆ける", required: false })
  titleJa?: string;

  @ApiProperty({ example: "Yoru ni Kakeru", required: false })
  titleLatin?: string;

  @ApiProperty({ example: "yorunikakeru", required: false })
  titleJaPronu?: string;

  @ApiProperty({ example: "yorunikakeru", required: false })
  titleLatinPronu?: string;

  @ApiProperty({ example: "JPOP", required: false })
  catalog?: string;

  @ApiProperty({ type: [ArtistSongDto] })
  artists: ArtistSongDto[];

  @ApiProperty({ type: TjSongDto, required: false })
  tjSong?: TjSongDto;

  @ApiProperty({
    example: "https://i.ytimg.com/vi/x8VYWazR5mE/default.jpg",
    required: false,
  })
  thumbnailDefault?: string;

  @ApiProperty({
    example: "https://i.ytimg.com/vi/x8VYWazR5mE/mqdefault.jpg",
    required: false,
  })
  thumbnailMedium?: string;

  @ApiProperty({
    example: "https://i.ytimg.com/vi/x8VYWazR5mE/hqdefault.jpg",
    required: false,
  })
  thumbnailHigh?: string;

  @ApiProperty({
    type: SpotifyTrackInfoDto,
    required: false,
    description: "Spotify 트랙 정보 (가장 인기 있는 트랙)",
  })
  spotify?: SpotifyTrackInfoDto;

  @ApiProperty({
    type: [SpotifyTrackInfoDto],
    required: false,
    description: "연결된 모든 Spotify 트랙 목록",
  })
  spotifyTracks?: SpotifyTrackInfoDto[];

  @ApiProperty({
    type: YoutubeVideoInfoDto,
    required: false,
    description: "YouTube 비디오 정보 (가장 조회수 높은 비디오)",
  })
  youtube?: YoutubeVideoInfoDto;

  @ApiProperty({
    type: [YoutubeVideoInfoDto],
    required: false,
    description: "연결된 모든 YouTube 비디오 목록",
  })
  youtubeVideos?: YoutubeVideoInfoDto[];

  @ApiProperty({
    type: BestSongProposeDto,
    required: false,
    description: "3개월 이내 가장 추천수가 높은 곡 추천 정보",
  })
  bestSongPropose?: BestSongProposeDto;

  @ApiProperty({
    type: [BestSongProposeDto],
    required: false,
    description: "3개월 이내 모든 곡 추천 목록",
  })
  songProposes?: BestSongProposeDto[];
}
