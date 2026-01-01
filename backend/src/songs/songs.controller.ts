import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  ParseIntPipe,
} from '@nestjs/common';
import { Song } from '@prisma/client';
import { SongsService } from './songs.service';
import { ApiResponse } from '../common/dto/api-response.dto';

@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  async findAll(@Query('q') query?: string, @Query('artistId') artistId?: string) {
    let songs: Song[];

    if (artistId && query) {
      // Both artistId and query: filter by artist first, then search within
      const artistSongs = await this.songsService.findByArtistId(Number(artistId));
      const lowerQuery = query.toLowerCase();
      songs = artistSongs.filter(
        (song) =>
          song.title.toLowerCase().includes(lowerQuery) ||
          song.titleKo?.toLowerCase().includes(lowerQuery)
      );
    } else if (artistId) {
      songs = await this.songsService.findByArtistId(Number(artistId));
    } else if (query) {
      songs = await this.songsService.searchByTitle(query);
    } else {
      songs = await this.songsService.findAll();
    }

    return ApiResponse.success(songs);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const song = await this.songsService.findById(id);
    if (!song) {
      throw new NotFoundException('Song not found');
    }
    return ApiResponse.success(song);
  }
}
