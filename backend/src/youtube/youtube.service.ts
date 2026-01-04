import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { fetchYoutubeOembed } from "../../../lib/youtube/oembed";
import { OembedDataDto } from "./dto/oembed-data.dto";

@Injectable()
export class YoutubeService {
  async getOembedData(url: string): Promise<OembedDataDto> {
    try {
      return await fetchYoutubeOembed(url);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        "Failed to fetch YouTube data",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
