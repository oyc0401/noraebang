import { ApiProperty } from "@nestjs/swagger";

export class PushArtistCreationQueueRequestDto {
  @ApiProperty({ type: [String], example: ["28397"] })
  tjSongIds: string[];
}
