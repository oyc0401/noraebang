import { ApiProperty } from "@nestjs/swagger";
import { SongDto } from "src/dto";

export class YoutubeOembedDataDto {
  @ApiProperty({ example: "YOASOBI - 夜に駆ける" })
  title: string;

  @ApiProperty({ example: "YOASOBI Official YouTube Channel" })
  authorName: string;
}

export class YoutubeSongSearchResponseDto {
  @ApiProperty({
    type: SongDto,
    required: false,
    description: "DB에서 찾은 곡 정보",
  })
  song?: SongDto;

  @ApiProperty({
    type: YoutubeOembedDataDto,
    required: false,
    description: "유튜브 oEmbed 데이터 (DB에서 곡을 찾지 못한 경우)",
  })
  youtube?: YoutubeOembedDataDto;

  @ApiProperty({ example: "DB에서 곡을 찾았습니다" })
  message: string;
}
