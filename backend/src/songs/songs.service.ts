import { Inject, Injectable } from "@nestjs/common";
import { getArtistAliases } from "../config/artist-aliases";
import type { ArtistRepository } from "../repositories/artist.repository";
import type { SongRepository } from "../repositories/song.repository";
import { ARTIST_REPOSITORY, SONG_REPOSITORY } from "../repositories/tokens";

@Injectable()
export class SongsService {
  constructor(
    @Inject(SONG_REPOSITORY) private songRepository: SongRepository,
    @Inject(ARTIST_REPOSITORY) private artistRepository: ArtistRepository,
  ) {}

  async findAll() {
    return this.songRepository.findAll();
  }

  async findById(id: number) {
    return this.songRepository.findById(id);
  }

  async searchByTitle(query: string) {
    return this.songRepository.searchByTitle(query);
  }

  async findByArtistId(artistId: number) {
    // 1. 주어진 artistId로 Artist 조회
    const artist = await this.artistRepository.findById(artistId);
    if (!artist || !artist.alias) {
      // alias가 없으면 기본 동작
      return this.songRepository.findByArtistId(artistId);
    }

    // 2. 별칭 그룹의 모든 별칭 가져오기
    const allAliases = getArtistAliases(artist.alias);

    // 3. 별칭이 하나뿐이면 (그룹에 속하지 않음) 기본 동작
    if (allAliases.length === 1) {
      return this.songRepository.findByArtistId(artistId);
    }

    // 4. 모든 별칭의 아티스트 조회
    const aliasArtists = await this.artistRepository.findByAliases(allAliases);
    const artistIds = aliasArtists.map((a) => a.id);

    // 5. 모든 아티스트의 곡 조회
    return this.songRepository.findByArtistIds(artistIds);
  }
}
