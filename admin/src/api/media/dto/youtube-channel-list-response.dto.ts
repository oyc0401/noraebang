import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LinkedArtistDto } from "./linked-artist.dto";

export class YoutubeChannelListItemDto {
  @ApiProperty({ example: "UCqECaJ8Gagnn7YCbPEzWH6g" })
  id: string;

  @ApiPropertyOptional({ example: "YOASOBI Official" })
  title?: string;

  @ApiPropertyOptional({ example: "@yoasobi" })
  customUrl?: string;

  @ApiPropertyOptional()
  thumbnail?: string;

  @ApiPropertyOptional({
    example: "1230000",
    description: "유튜브 API 기준 구독자 수",
  })
  subscriberCount?: string;

  @ApiPropertyOptional({
    example: "250",
    description: "유튜브 API 기준 영상 수",
  })
  videoCount?: string;

  @ApiProperty({ example: 231, description: "media DB에 저장된 영상 수" })
  storedVideoCount: number;

  @ApiPropertyOptional({ description: "마지막 갱신 시각" })
  fetchedAt?: string;

  @ApiProperty({
    type: [LinkedArtistDto],
    description: "jpop DB에서 이 채널에 연결된 아티스트",
  })
  artists: LinkedArtistDto[];
}

export class YoutubeChannelListResponseDto {
  @ApiProperty({ type: [YoutubeChannelListItemDto] })
  data: YoutubeChannelListItemDto[];

  @ApiProperty({ example: 50 })
  nextOffset: number;

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiProperty({ example: 13061 })
  total: number;
}
