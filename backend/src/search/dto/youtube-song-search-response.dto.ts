import { ApiProperty } from "@nestjs/swagger";
import { SongDto } from "src/dto";

export class YoutubeSongSearchResponseDto {
  @ApiProperty({ type: SongDto, required: false })
  data?: SongDto;

  @ApiProperty({ example: "success", required: false })
  message?: string;
}
