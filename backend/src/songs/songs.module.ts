import { Module } from '@nestjs/common';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';
import { SongMemoryRepository } from '../repositories/memory/song-memory.repository';
import { SONG_REPOSITORY } from '../repositories/tokens';

@Module({
  controllers: [SongsController],
  providers: [
    SongsService,
    {
      provide: SONG_REPOSITORY,
      useClass: SongMemoryRepository,
    },
  ],
  exports: [SongsService],
})
export class SongsModule {}
