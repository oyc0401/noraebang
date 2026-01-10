import { ApiProperty } from "@nestjs/swagger";
import { ApiResponseMeta, SongDto } from "../../dto";

export class SongListResponseDto {
  @ApiProperty({ type: [SongDto] })
  data: SongDto[];

  @ApiProperty({ example: null, required: false })
  message?: string;

  @ApiProperty({ type: ApiResponseMeta, required: false })
  meta?: ApiResponseMeta;
}

export class SongDetailResponseDto {
  @ApiProperty({ type: SongDto })
  data: SongDto;

  @ApiProperty({ example: null, required: false })
  message?: string;
}
