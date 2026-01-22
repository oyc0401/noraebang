import { ApiProperty } from "@nestjs/swagger";

export class SpotifyInfoDto {
  @ApiProperty({ example: "64tJ2EAv1R6UaZqc4iOCyj" })
  spotifyId: string;

  @ApiProperty({
    example: "https://open.spotify.com/artist/64tJ2EAv1R6UaZqc4iOCyj",
    required: false,
  })
  spotifyUrl?: string;

  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: 85, required: false })
  popularity?: number;

  @ApiProperty({ example: 5000000, required: false })
  followers?: number;

  @ApiProperty({
    example: ["j-pop", "j-rock"],
    required: false,
    type: [String],
  })
  genres?: string[];

  @ApiProperty({
    example: "https://i.scdn.co/image/ab6761610000e5eb.jpg",
    required: false,
  })
  imageUrl?: string;
}
