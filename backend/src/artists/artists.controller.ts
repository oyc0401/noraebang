import { Controller, Get, Param, NotFoundException, Query } from '@nestjs/common';
import { ArtistsService } from './artists.service';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  async findAll(@Query('includeYoutube') includeYoutube?: string) {
    // includeYoutube=true인 경우 YouTube 정보 포함
    if (includeYoutube === 'true') {
      const artists = await this.artistsService.findAllWithYoutube();

      // 응답 포맷: 구독자 수와 미디엄 썸네일 포함
      const formatted = artists.map(artist => ({
        id: artist.id,
        name: artist.name,
        nameKo: artist.nameKo,
        alias: artist.alias,
        youtube: artist.youtubeChannel ? {
          channelId: artist.youtubeChannel.channelId,
          title: artist.youtubeChannel.title,
          subscriberCount: artist.youtubeChannel.subscriberCount,
          videoCount: artist.youtubeChannel.videoCount,
          thumbnail: artist.youtubeChannel.thumbnailMedium || artist.youtubeChannel.thumbnailDefault,
          customUrl: artist.youtubeChannel.customUrl,
        } : null,
      }));

      return {
        data: formatted,
        cached: true, // 캐시 사용 여부는 서비스에서 관리
      };
    }

    // 기본: YouTube 정보 없이 반환
    const artists = await this.artistsService.findAll();
    return { data: artists };
  }

  @Get(':alias')
  async findByAlias(@Param('alias') alias: string) {
    const artist = await this.artistsService.findByAlias(alias);
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
    return { data: artist };
  }
}
