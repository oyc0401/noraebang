import { ApiProperty } from "@nestjs/swagger";
import { SongDto } from "../../dto";

export class SongListResponseDto {
  @ApiProperty({ type: [SongDto] })
  data: SongDto[];

  @ApiProperty({ example: null, required: false })
  message?: string | null;
}

export class SongDetailResponseDto {
  @ApiProperty({ type: SongDto })
  data: SongDto;

  @ApiProperty({ example: null, required: false })
  message?: string | null;
}
