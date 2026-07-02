import { join } from "node:path";
import { NestFactory } from "@nestjs/core";
import { type NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { AdminPageModule } from "./admin-page/admin-page.module";
import { AppModule } from "./app.module";
import { ArtistCreationQueueModule } from "./api/collection/artist-creation-queue/artist-creation-queue.module";
import { ParserModule } from "./api/collection/parser/parser.module";
import { QueueModule } from "./api/collection/queue/queue.module";
import { SongArtistQueueModule } from "./api/collection/song-artist-queue/song-artist-queue.module";
import { SongCreationQueueModule } from "./api/collection/song-creation-queue/song-creation-queue.module";
import { SongModule } from "./api/song/song.module";
import { HealthModule } from "./api/health/health.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:3000",
    "http://localhost:5174",
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle("JPOP Admin API")
    .setDescription("JPOP admin backend API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const collectionConfig = new DocumentBuilder()
    .setTitle("JPOP Admin Collection API")
    .setDescription("TJ 곡 수집부터 큐 처리까지의 collection API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [HealthModule, AdminPageModule, SongModule],
  });
  const collectionDocument = SwaggerModule.createDocument(app, collectionConfig, {
    include: [
      ParserModule,
      QueueModule,
      SongArtistQueueModule,
      ArtistCreationQueueModule,
      SongCreationQueueModule,
    ],
  });
  // 문서 UI는 Swagger UI 대신 Scalar를 쓴다. (OpenAPI 문서 생성은 @nestjs/swagger 그대로)
  app.use("/api/docs/collection", apiReference({ content: collectionDocument }));
  app.use("/api/docs", apiReference({ content: document }));
  app.useStaticAssets(join(process.cwd(), "public", "admin"), {
    prefix: "/admin",
  });

  await app.listen(process.env.PORT ?? 3002, "0.0.0.0");
}

void bootstrap();
