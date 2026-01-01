import { Injectable } from "@nestjs/common";
import { TypesenseService } from "../typesense/typesense.service";
import type {
  ArtistSearchResultDto,
  SearchResultDto,
  TitleSearchResultDto,
} from "./dto/search-response.dto";

@Injectable()
export class SearchService {
  private readonly collectionName = "songs";

  constructor(private readonly typesenseService: TypesenseService) {}

  async search<T = SearchResultDto>(
    query: string,
    options?: {
      provider?: string;
      limit?: number;
    },
  ): Promise<T[]> {
    const client = this.typesenseService.getClient();

    const searchParameters = {
      q: query,
      query_by: "title,titleKo,titleNorm,artistName,artistNameKo,karaokeNo",
      limit: options?.limit || 20,
      ...(options?.provider && {
        filter_by: `provider:=${options.provider}`,
      }),
    };

    try {
      const searchResults = await client
        .collections(this.collectionName)
        .documents()
        .search(searchParameters);

      return (searchResults.hits?.map((hit) => hit.document) || []) as T[];
    } catch (error) {
      console.error("Search error:", error);
      return [];
    }
  }

  async searchByKaraokeNo(
    karaokeNo: string,
    provider?: string,
  ): Promise<SearchResultDto[]> {
    return this.search<SearchResultDto>(karaokeNo, { provider });
  }

  async searchByArtist(artistName: string): Promise<ArtistSearchResultDto[]> {
    return this.search<ArtistSearchResultDto>(artistName);
  }

  async searchByTitle(title: string): Promise<TitleSearchResultDto[]> {
    return this.search<TitleSearchResultDto>(title);
  }
}
