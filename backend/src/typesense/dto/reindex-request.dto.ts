import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, Min } from "class-validator";

export class TypesenseReindexRequestDto {
  @ApiProperty({
    enum: ["artists", "songs", "all"],
    default: "all",
    description: "재생성할 인덱스 범위",
  })
  @IsEnum(["artists", "songs", "all"])
  target: "artists" | "songs" | "all" = "all";

  @ApiPropertyOptional({
    description:
      "특정 artistId 이하만 인덱싱할 때 사용 (미지정 시 272까지 처리)",
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxArtistId?: number;
}
