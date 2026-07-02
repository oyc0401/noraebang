import { ApiProperty } from "@nestjs/swagger";

export class TjSongListItemDto {
  @ApiProperty({ description: "tj_song.id: TJ 노래방 번호", example: "52522" })
  tjNumber: string;

  @ApiProperty({ example: "踊" })
  title: string;

  @ApiProperty({ required: false, example: "Ado" })
  artist?: string;

  @ApiProperty({ required: false, example: "JPOP" })
  catalog?: string;

  @ApiProperty({ required: false, example: "2026-06-22" })
  publishdate?: string;

  @ApiProperty({ example: true })
  isCreatedAsSong: boolean;

  @ApiProperty({ example: false })
  isInQueue: boolean;
}
