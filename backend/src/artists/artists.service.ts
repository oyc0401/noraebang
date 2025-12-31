import { Injectable, Inject } from '@nestjs/common';
import type { ArtistRepository, ArtistWithYoutube } from '../repositories/artist.repository';
import { ARTIST_REPOSITORY } from '../repositories/tokens';

@Injectable()
export class ArtistsService {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5분

  constructor(
    @Inject(ARTIST_REPOSITORY) private artistRepository: ArtistRepository,
  ) {}

  async findAll() {
    return this.artistRepository.findAll();
  }

  async findAllWithYoutube(): Promise<ArtistWithYoutube[]> {
    const cacheKey = 'artists_with_youtube';
    const cached = this.cache.get(cacheKey);

    // 캐시가 있고 유효하면 반환
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    // DB에서 조회
    const artists = await this.artistRepository.findAllWithYoutube();

    // 캐시 저장
    this.cache.set(cacheKey, {
      data: artists,
      timestamp: Date.now(),
    });

    return artists;
  }

  async findById(id: number) {
    return this.artistRepository.findById(id);
  }

  async findByAlias(alias: string) {
    return this.artistRepository.findByAlias(alias);
  }

  /**
   * ID 또는 alias로 아티스트 조회
   * - 숫자면 ID로 조회
   * - 문자열이면 alias로 조회
   */
  async findByIdOrAlias(identifier: string) {
    // 숫자인지 체크
    const parsedId = parseInt(identifier, 10);
    if (!isNaN(parsedId) && parsedId.toString() === identifier) {
      return this.artistRepository.findById(parsedId);
    }

    // alias로 조회
    return this.artistRepository.findByAlias(identifier);
  }

  // 캐시 초기화 메서드 (외부에서 호출 가능)
  clearCache() {
    this.cache.clear();
  }
}
