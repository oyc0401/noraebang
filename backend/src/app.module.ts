import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ArtistsModule } from "./artists/artists.module";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ReportsModule } from "./reports/reports.module";
import { SearchModule } from "./search/search.module";
import { SongsModule } from "./songs/songs.module";
import { TypesenseModule } from "./typesense/typesense.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    TypesenseModule,
    AuthModule,
    SearchModule,
    ArtistsModule,
    SongsModule,
    ReportsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
