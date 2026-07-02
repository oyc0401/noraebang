import { ApiProperty } from "@nestjs/swagger";

export class ApplySongUpdateRequestDto {
  @ApiProperty({ required: false, example: "JPOP" })
  catalog?: string | null;

  @ApiProperty({ example: "マリーゴールド" })
  title: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleKo?: string | null;

  @ApiProperty({ required: false, example: "マリーゴールド" })
  titleJa?: string | null;

  @ApiProperty({ required: false, example: "마리-고-루도" })
  titleJaPronu?: string | null;

  @ApiProperty({ required: false, example: "まりーごーるど" })
  titleJaKana?: string | null;

  @ApiProperty({ required: false, example: "金盞花" })
  titleJaKanji?: string | null;

  @ApiProperty({ required: false, example: "Marigold" })
  titleLatin?: string | null;

  @ApiProperty({ required: false, example: "마리골드" })
  titleLatinPronu?: string | null;

  @ApiProperty({
    description: "곡에 추가할 유튜브 영상 ID 목록 (기존 연결은 유지, 추가만)",
    required: false,
    type: [String],
    example: ["0xSiBpUdW4E"],
  })
  youtubeVideoIds?: string[];

  @ApiProperty({
    description: "곡에 추가할 스포티파이 트랙 ID 목록 (기존 연결은 유지, 추가만)",
    required: false,
    type: [String],
    example: ["7yq4Qj7cqayVTp3FF9CWbm"],
  })
  spotifyTrackIds?: string[];

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string | null;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string | null;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string | null;
}
