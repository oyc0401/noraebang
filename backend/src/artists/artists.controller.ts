import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ArtistsService } from './artists.service';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  async findAll() {
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
