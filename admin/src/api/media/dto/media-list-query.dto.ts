import { ApiPropertyOptional } from "@nestjs/swagger";

export type MediaListSortBy = "popular" | "fetchedAt" | "name";

export class MediaListQueryDto {
  @ApiPropertyOptional({
    example: "YOASOBI",
    description: "이름/커스텀 URL/ID 검색",
  })
  search?: string;

  @ApiPropertyOptional({
    enum: ["popular", "fetchedAt", "name"],
    description:
      "popular: 구독자/팔로워순, fetchedAt: 갱신 오래된순, name: 이름순",
  })
  sortBy?: MediaListSortBy;

  @ApiPropertyOptional({
    enum: ["true"],
    description: "true면 jpop DB 아티스트에 연결된 채널/아티스트만 조회",
  })
  jpopOnly?: string;

  @ApiPropertyOptional({ example: "0" })
  offset?: string;

  @ApiPropertyOptional({ example: "50" })
  limit?: string;
}
