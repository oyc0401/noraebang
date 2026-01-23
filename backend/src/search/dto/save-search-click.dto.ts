import { ApiProperty } from "@nestjs/swagger";

import { IsInt, IsOptional, IsString, MaxLength } from "class-validator";

export class SaveSearchClickDto {
  @ApiProperty({ description: "검색어", example: "아이유", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  query?: string;

  @ApiProperty({
    description: "검색 URL (링크 검색)",
    example: "https://youtube.com/watch?v=xxx",
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  url?: string;

  @ApiProperty({
    description: "클릭한 아티스트 ID",
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  artistId?: number;

  @ApiProperty({ description: "클릭한 곡 ID", required: false, example: 1 })
  @IsOptional()
  @IsInt()
  songId?: number;
}
