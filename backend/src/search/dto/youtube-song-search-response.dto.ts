import { ApiProperty } from "@nestjs/swagger";
import { SongDto } from "src/dto";

export class YoutubeSongSearchResponseDto {
  @ApiProperty({
    type: [SongDto],
    description: "DB에서 찾은 곡 정보 목록 (유튜브 ID 일치 시 해당 곡들, 검색 시 여러 개)",
  })
  songs: SongDto[];

  @ApiProperty({
    description: "유튜브 Video ID로 직접 매칭되었는지 여부 (false면 oEmbed 검색으로 찾음)",
    example: true,
  })
  matchedByVideoId: boolean;

  @ApiProperty({ example: "DB에서 곡을 찾았습니다" })
  message: string;
}
