import { ApiProperty } from "@nestjs/swagger";
import { SongDto } from "../../songs/dto/song-response.dto";

export class YoutubeSongSearchResponseDto {
  @ApiProperty({ type: SongDto, nullable: true })
  data: SongDto | null;

  @ApiProperty({ example: "success", required: false })
  message?: string;
}
