import { Module } from '@nestjs/common';
import { ArtistsController } from './artists.controller';
import { ArtistsService } from './artists.service';
import { ArtistMemoryRepository } from '../repositories/memory/artist-memory.repository';
import { ARTIST_REPOSITORY } from '../repositories/tokens';

@Module({
  controllers: [ArtistsController],
  providers: [
    ArtistsService,
    {
      provide: ARTIST_REPOSITORY,
      useClass: ArtistMemoryRepository,
    },
  ],
  exports: [ArtistsService],
})
export class ArtistsModule {}
