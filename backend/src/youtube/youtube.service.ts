import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { z } from "zod";
import { OembedDataDto } from "./dto/oembed-data.dto";

const YoutubeOembedSchema = z.object({
  title: z.string(),
  author_name: z.string(),
  author_url: z.string(),
  type: z.string(),
  height: z.number().optional(),
  width: z.number().optional(),
  version: z.string(),
  provider_name: z.string(),
  provider_url: z.string(),
  thumbnail_height: z.number().optional(),
  thumbnail_width: z.number().optional(),
  thumbnail_url: z.string().optional(),
  html: z.string().optional(),
});

@Injectable()
export class YoutubeService {
  async getOembedData(url: string): Promise<OembedDataDto> {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new HttpException(
          "Failed to fetch YouTube data",
          response.status,
        );
      }

      return YoutubeOembedSchema.parse(await response.json());
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
