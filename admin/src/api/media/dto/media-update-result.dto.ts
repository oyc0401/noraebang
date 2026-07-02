import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class YoutubeChannelUpdateResultDto {
  @ApiProperty({ example: "UCqECaJ8Gagnn7YCbPEzWH6g" })
  channelId: string;

  @ApiPropertyOptional({ example: "YOASOBI Official" })
  title?: string;

  @ApiProperty({ example: 12, description: "새로 저장된 영상 수" })
  newVideoCount: number;

  @ApiProperty({
    example: 3,
    description: "이번 갱신에 사용한 유튜브 API 호출 수",
  })
  apiCallCount: number;
}

export class YoutubeVideoStatsRefreshResultDto {
  @ApiProperty({ example: "UCqECaJ8Gagnn7YCbPEzWH6g" })
  channelId: string;

  @ApiProperty({ example: 231, description: "통계를 갱신한 영상 수" })
  videoCount: number;

  @ApiProperty({ example: 5 })
  apiCallCount: number;
}

export class SpotifyArtistUpdateResultDto {
  @ApiProperty({ example: "64tJ2EAv1R6UaZqc4iOCyj" })
  artistId: string;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: 34, description: "조회한 앨범/싱글 수" })
  albumCount: number;

  @ApiProperty({ example: 8, description: "새로 저장된 트랙 수" })
  newTrackCount: number;

  @ApiProperty({
    example: 120,
    description: "아티스트-트랙으로 새로 연결된 수",
  })
  linkedTrackCount: number;

  @ApiProperty({ example: 6 })
  apiCallCount: number;
}
