import { ApiProperty } from "@nestjs/swagger";
import { OembedDataDto } from "../../youtube/dto/oembed-data.dto";

export class YoutubeOembedResponseDto {
  @ApiProperty({ type: OembedDataDto })
  data: OembedDataDto;

  @ApiProperty({ example: "success", required: false })
  message?: string;
}
