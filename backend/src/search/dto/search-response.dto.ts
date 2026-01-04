import { ApiProperty } from "@nestjs/swagger";
import { ArtistDetailsDto, SongDto } from "../../dto";

export class SearchResultDto {
  @ApiProperty({
    enum: ["artist", "song"],
    example: "artist",
    description: "검색 결과 타입",
  })
  type: "artist" | "song";

  @ApiProperty({ type: () => ArtistDetailsDto, required: false })
  artist?: ArtistDetailsDto;

  @ApiProperty({ type: () => SongDto, required: false })
  song?: SongDto;
}

export class SearchResponseDto {
  @ApiProperty({ type: [SearchResultDto] })
  data: SearchResultDto[];

  @ApiProperty({ example: "검색 성공" })
  message: string;

  @ApiProperty({
    description: "페이지네이션 메타데이터",
    example: {
      total: 150,
      page: 1,
      limit: 20,
      hasMore: true,
    },
  })
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}
