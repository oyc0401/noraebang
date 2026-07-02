import { ApiProperty } from "@nestjs/swagger";
import {
  QueueSpotifyTrackDto,
  QueueYoutubeVideoDto,
} from "../../song-creation-queue/dto/song-creation-queue-item.dto";

export class CurrentSongMediaDto {
  @ApiProperty({ description: "media id", example: "0xSiBpUdW4E" })
  id: string;

  @ApiProperty({
    description: "media db에서 조회한 표시용 제목 (없으면 id 그대로)",
    example: "あいみょん - マリーゴールド【OFFICIAL MUSIC VIDEO】",
  })
  label: string;
}

export class CurrentSongDto {
  @ApiProperty({ example: "マリーゴールド" })
  title: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleKo?: string;

  @ApiProperty({ required: false, example: "マリーゴールド" })
  titleJa?: string;

  @ApiProperty({ required: false, example: "마리-고-루도" })
  titleJaPronu?: string;

  @ApiProperty({ required: false, example: "まりーごーるど" })
  titleJaKana?: string;

  @ApiProperty({ required: false, example: "金盞花" })
  titleJaKanji?: string;

  @ApiProperty({ required: false, example: "Marigold" })
  titleLatin?: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleLatinPronu?: string;

  @ApiProperty({ required: false, example: "JPOP" })
  catalog?: string;

  @ApiProperty({ example: true })
  visible: boolean;

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string;

  @ApiProperty({
    description: "현재 연결된 유튜브 영상 (해제 불가, 표시용)",
    type: [CurrentSongMediaDto],
  })
  youtubeVideos: CurrentSongMediaDto[];

  @ApiProperty({
    description: "현재 연결된 스포티파이 트랙 (해제 불가, 표시용)",
    type: [CurrentSongMediaDto],
  })
  spotifyTracks: CurrentSongMediaDto[];
}

export class SongUpdateQueueItemDto {
  @ApiProperty({ description: "song_update_queue.id", example: 1 })
  id: number;

  @ApiProperty({ description: "song.id: 업데이트 대상 곡 ID", example: 1 })
  songId: number;

  @ApiProperty({ description: "push 시점에 재생성한 제목", example: "マリーゴールド" })
  title: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleKo?: string;

  @ApiProperty({ required: false, example: "マリーゴールド" })
  titleJa?: string;

  @ApiProperty({ required: false, example: "마리-고-루도" })
  titleJaPronu?: string;

  @ApiProperty({ required: false, example: "まりーごーるど" })
  titleJaKana?: string;

  @ApiProperty({ required: false, example: "金盞花" })
  titleJaKanji?: string;

  @ApiProperty({ required: false, example: "Marigold" })
  titleLatin?: string;

  @ApiProperty({ required: false, example: "마리골드" })
  titleLatinPronu?: string;

  @ApiProperty({
    description: "push 시점에 재검색한 유튜브 후보 (표시용 제목 포함)",
    type: [QueueYoutubeVideoDto],
  })
  youtubeVideos: QueueYoutubeVideoDto[];

  @ApiProperty({
    description: "push 시점에 재검색한 스포티파이 후보 (표시용 이름 포함)",
    type: [QueueSpotifyTrackDto],
  })
  spotifyTracks: QueueSpotifyTrackDto[];

  @ApiProperty({ required: false, example: "https://example.com/default.jpg" })
  thumbnailDefault?: string;

  @ApiProperty({ required: false, example: "https://example.com/medium.jpg" })
  thumbnailMedium?: string;

  @ApiProperty({ required: false, example: "https://example.com/high.jpg" })
  thumbnailHigh?: string;

  @ApiProperty({ description: "연결된 아티스트 ID", required: false, example: 140 })
  artistId?: number;

  @ApiProperty({ description: "연결된 아티스트 이름", required: false, example: "あいみょん" })
  artistName?: string;

  @ApiProperty({
    description: "업데이트 대상 곡의 현재 값 (비교 표시용). 곡이 삭제됐으면 없음",
    required: false,
    type: CurrentSongDto,
  })
  currentSong?: CurrentSongDto;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
