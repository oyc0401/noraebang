import { Injectable } from '@nestjs/common';
import { TypesenseService } from '../typesense/typesense.service';

@Injectable()
export class SearchService {
  private readonly collectionName = 'songs';

  constructor(private readonly typesenseService: TypesenseService) {}

  async search(query: string, options?: {
    provider?: string;
    limit?: number;
  }) {
    const client = this.typesenseService.getClient();

    const searchParameters = {
      q: query,
      query_by: 'title,titleKo,titleNorm,artistName,artistNameKo,karaokeNo',
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

      return searchResults.hits?.map((hit) => hit.document) || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  async searchByKaraokeNo(karaokeNo: string, provider?: string) {
    return this.search(karaokeNo, { provider });
  }

  async searchByArtist(artistName: string) {
    return this.search(artistName);
  }

  async searchByTitle(title: string) {
    return this.search(title);
  }
}
