import { ApiPropertyOptional } from "@nestjs/swagger";

// PATCH 시맨틱: 포함된 필드만 수정한다. null/빈 문자열은 해당 필드를 비운다.
export class UpdateSongRequestDto {
  @ApiPropertyOptional({ example: "マリーゴールド" })
  title?: string;

  @ApiPropertyOptional({ nullable: true, example: "마리골드" })
  titleKo?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "マリーゴールド" })
  titleJa?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "마리-고-루도" })
  titleJaPronu?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "まりーごーるど" })
  titleJaKana?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "金盞花" })
  titleJaKanji?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "Marigold" })
  titleLatin?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "마리골드" })
  titleLatinPronu?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "JPOP" })
  catalog?: string | null;

  @ApiPropertyOptional({ example: true })
  visible?: boolean;

  @ApiPropertyOptional({ nullable: true, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string | null;

  @ApiPropertyOptional({ nullable: true, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string | null;

  @ApiPropertyOptional({
    description: "포함하면 연결 유튜브 영상을 이 목록으로 교체한다.",
    type: [String],
    example: ["0xSiBpUdW4E"],
  })
  youtubeVideoIds?: string[];

  @ApiPropertyOptional({
    description: "포함하면 연결 스포티파이 트랙을 이 목록으로 교체한다.",
    type: [String],
    example: ["7yq4Qj7cqayVTp3FF9CWbm"],
  })
  spotifyTrackIds?: string[];
}
