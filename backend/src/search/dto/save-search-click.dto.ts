import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class SaveSearchClickDto {
  @ApiProperty({ description: "검색어", example: "아이유" })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  query: string;

  @ApiProperty({ description: "클릭한 아티스트 ID", required: false, example: 1 })
  @IsOptional()
  @IsInt()
  artistId?: number;

  @ApiProperty({ description: "클릭한 곡 ID", required: false, example: 1 })
  @IsOptional()
  @IsInt()
  songId?: number;
}
