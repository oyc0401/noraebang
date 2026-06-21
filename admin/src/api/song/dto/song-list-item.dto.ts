import { ApiProperty } from "@nestjs/swagger";

export class SongListItemDto {
  @ApiProperty({ example: "52522" })
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
