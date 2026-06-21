import { ApiProperty } from "@nestjs/swagger";

export class RemoveSongQueueItemsRequestDto {
  @ApiProperty({ example: ["12345", "67890"], type: [String] })
  tjNumbers: string[];
}
