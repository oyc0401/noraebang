import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SearchSuggestionsQueryDto {
  @ApiProperty({ description: "검색어", example: "아이유", required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  query?: string;
}
