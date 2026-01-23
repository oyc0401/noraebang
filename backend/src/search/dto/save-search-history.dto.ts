import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class SaveSearchHistoryDto {
  @ApiProperty({ description: "검색어", example: "아이유", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @ApiProperty({ description: "검색 URL (링크 검색)", example: "https://youtube.com/watch?v=xxx", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;
}
