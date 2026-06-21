import { ApiProperty } from "@nestjs/swagger";

export class SearchParserLogResponseDto {
  @ApiProperty({
    required: false,
    example: "2026-06-22T12:34:56.000Z",
  })
  lastExecutedAt?: string;
}
