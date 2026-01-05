import { ApiProperty } from "@nestjs/swagger";
import { IsString, MaxLength, MinLength } from "class-validator";

export class SearchSuggestionsQueryDto {
  @ApiProperty({ description: "검색어", example: "아이유" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  query: string;
}
