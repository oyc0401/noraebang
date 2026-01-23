import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class SaveSearchHistoryDto {
  @ApiProperty({ description: "검색어", example: "아이유" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  query: string;
}
