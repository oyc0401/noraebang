import { Injectable } from "@nestjs/common";
import { ArtistDto, SongDto } from "../dto";
import { SongsService } from "../songs/songs.service";
import { ArtistsService } from "../artists/artists.service";

const normalizeForMatching = (value: string): string =>
  value.normalize("NFKC").toLowerCase().replace(/\s+/g, "");

const includesMatch = (target: string, candidate: string): boolean => {
  if (!target || !candidate) {
    return false;
  }
  return candidate.includes(target);
};

@Injectable()
export class SearchService {
  constructor(
    private readonly songsService: SongsService,
    private readonly artistsService: ArtistsService,
  ) {}

  private filterSongsByTitleMatch(
    songs: SongDto[],
    normalizedTitle: string,
  ): SongDto[] {
    return songs.filter((song) => {
      const normalizedSongTitle = normalizeForMatching(song.title);
      const normalizedSongTitleKo = song.titleKo
        ? normalizeForMatching(song.titleKo)
        : "";

      if (includesMatch(normalizedTitle, normalizedSongTitle)) {
        return true;
      }

      if (
        normalizedSongTitleKo &&
        includesMatch(normalizedTitle, normalizedSongTitleKo)
      ) {
        return true;
      }
      return false;
    });
  }

  // 제목과 아티스트 이름으로 곡 검색
  async searchSongsByTitleAndArtistName(query: {
    title: string;
    authorName: string;
  }): Promise<SongDto[]> {
    const normalizedTitle = normalizeForMatching(query.title);

    if (!normalizedTitle) {
      return [];
    }

    const songs = await this.songsService.findAll();

    return this.filterSongsByTitleMatch(songs, normalizedTitle);
  }

  async searchSongsByTitle(query: { title: string }): Promise<SongDto[]> {
    const normalizedTitle = normalizeForMatching(query.title);

    if (!normalizedTitle) {
      return [];
    }

    const songs = await this.songsService.findAll();
    return this.filterSongsByTitleMatch(songs, normalizedTitle);
  }

  async searchArtistsByArtistName(query: {
    name: string;
  }): Promise<ArtistDto[]> {
    const normalizedName = normalizeForMatching(query.name);

    if (!normalizedName) {
      return [];
    }

    const artists = await this.artistsService.findAll();
    return artists.filter((artist) => {
      const normalizedArtistName = normalizeForMatching(artist.name);
      const normalizedArtistNameKo = artist.nameKo
        ? normalizeForMatching(artist.nameKo)
        : "";
      const normalizedAlias = artist.alias
        ? normalizeForMatching(artist.alias)
        : "";

      if (includesMatch(normalizedName, normalizedArtistName)) {
        return true;
      }

      if (
        normalizedArtistNameKo &&
        includesMatch(normalizedName, normalizedArtistNameKo)
      ) {
        return true;
      }

      if (normalizedAlias && includesMatch(normalizedName, normalizedAlias)) {
        return true;
      }

      return false;
    });
  }
}
