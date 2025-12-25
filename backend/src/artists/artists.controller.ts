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

  @Get(':pathname')
  async findByPathname(@Param('pathname') pathname: string) {
    const artist = await this.artistsService.findByPathname(pathname);
    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
    return { data: artist };
  }
}
