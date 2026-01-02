import { ApiProperty } from "@nestjs/swagger";
import { ArtistDetailsDto, ArtistDto } from "../../dto";

export class ArtistListResponseDto {
  @ApiProperty({ type: [ArtistDto] })
  data: ArtistDto[];

  @ApiProperty({ example: null, required: false })
  message?: string;
}

export class ArtistDetailsListResponseDto {
  @ApiProperty({ type: [ArtistDetailsDto] })
  data: ArtistDetailsDto[];

  @ApiProperty({ example: null, required: false })
  message?: string;
}

export class ArtistDetailResponseDto {
  @ApiProperty({ type: ArtistDto })
  data: ArtistDto;

  @ApiProperty({ example: null, required: false })
  message?: string;
}

export class YoutubeChannelUpdateResponseDataDto {
  @ApiProperty({ example: "YOASOBI" })
  artist: string;

  @ApiProperty({ example: "UCvpredjG93ifbCP1Y77JyFA" })
  channelId: string;

  @ApiProperty({ example: "Ayase / YOASOBI" })
  channelTitle: string;

  @ApiProperty({ example: 1000000, required: false })
  subscriberCount?: number;
}

export class YoutubeChannelUpdateResponseDto {
  @ApiProperty({ type: YoutubeChannelUpdateResponseDataDto })
  data: YoutubeChannelUpdateResponseDataDto;

  @ApiProperty({
    example: "YouTube channel updated successfully",
    required: false,
  })
  message?: string;
}
