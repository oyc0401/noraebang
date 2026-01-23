import { ApiProperty } from "@nestjs/swagger";

export class RecentSearchesResponseDto {
  @ApiProperty({
    example: ["YOASOBI", "아이묭", "Vaundy"],
    description: "최근 검색어 목록",
  })
  data: string[];

  @ApiProperty({ example: "최근 검색어 조회 성공" })
  message: string;
}
