import { ApiProperty } from "@nestjs/swagger";

export class RecentPopularSearchDataDto {
  @ApiProperty({
    example: ["YOASOBI", "아이묭"],
    description: "최근 검색어 목록",
  })
  recents: string[];

  @ApiProperty({
    example: ["Vaundy", "YOASOBI", "요루시카"],
    description: "인기 검색어 목록",
  })
  populars: string[];
}

export class RecentSearchesResponseDto {
  @ApiProperty({ type: RecentPopularSearchDataDto })
  data: RecentPopularSearchDataDto;

  @ApiProperty({ example: "검색어 추천 조회 성공" })
  message: string;
}
