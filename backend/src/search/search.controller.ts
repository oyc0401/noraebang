import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query("q") query: string,
    @Query("provider") provider?: string,
    @Query("limit") limit?: string,
  ) {
    if (!query) {
      return { data: [] };
    }

    const results = await this.searchService.search(query, {
      provider,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return { data: results };
  }

  @Get("karaoke")
  async searchByKaraokeNo(
    @Query("no") karaokeNo: string,
    @Query("provider") provider?: string,
  ) {
    if (!karaokeNo) {
      return { data: [] };
    }

    const results = await this.searchService.searchByKaraokeNo(
      karaokeNo,
      provider,
    );

    return { data: results };
  }

  @Get("artist")
  async searchByArtist(@Query("name") artistName: string) {
    if (!artistName) {
      return { data: [] };
    }

    const results = await this.searchService.searchByArtist(artistName);
    return { data: results };
  }

  @Get("title")
  async searchByTitle(@Query("q") title: string) {
    if (!title) {
      return { data: [] };
    }

    const results = await this.searchService.searchByTitle(title);
    return { data: results };
  }
}
