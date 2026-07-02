import { ApiProperty } from "@nestjs/swagger";

// jpop DB Artist에서 media 항목(유튜브 채널/스포티파이 아티스트)에 연결된 아티스트
export class LinkedArtistDto {
  @ApiProperty({ example: 140 })
  id: number;

  @ApiProperty({ example: "Ado" })
  name: string;
}
