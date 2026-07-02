import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { LinkedArtistDto } from "./linked-artist.dto";

export class SpotifyArtistListItemDto {
  @ApiProperty({ example: "64tJ2EAv1R6UaZqc4iOCyj" })
  id: string;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiPropertyOptional()
  image?: string;

  @ApiPropertyOptional({ example: "5200000" })
  followers?: string;

  @ApiPropertyOptional({ example: 78 })
  popularity?: number;

  @ApiProperty({ example: 120, description: "media DB에 연결된 트랙 수" })
  storedTrackCount: number;

  @ApiPropertyOptional({ description: "마지막 갱신 시각" })
  fetchedAt?: string;

  @ApiProperty({
    type: [LinkedArtistDto],
    description: "jpop DB에서 이 스포티파이 아티스트에 연결된 아티스트",
  })
  artists: LinkedArtistDto[];
}

export class SpotifyArtistListResponseDto {
  @ApiProperty({ type: [SpotifyArtistListItemDto] })
  data: SpotifyArtistListItemDto[];

  @ApiProperty({ example: 50 })
  nextOffset: number;

  @ApiProperty({ example: true })
  hasMore: boolean;

  @ApiProperty({ example: 11777 })
  total: number;
}
