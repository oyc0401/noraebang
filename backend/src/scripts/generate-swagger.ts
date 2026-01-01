import "reflect-metadata";
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";

class PrismaServiceForSwagger extends PrismaService {
  override async onModuleInit() {
    // DB 연결 없이 Swagger 문서만 생성
  }

  override async onModuleDestroy() {
    // DB 연결 스킵
  }
}

async function createApp(): Promise<INestApplication> {
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      "postgresql://placeholder:placeholder@localhost:5432/placeholder";
  }

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useClass(PrismaServiceForSwagger)
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

async function generateSwagger(): Promise<void> {
  const app = await createApp();

  const config = new DocumentBuilder()
    .setTitle("노래방 검색 API")
    .setDescription("노래방 검색 서비스 API 문서")
    .setVersion("1.0")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputPath = resolve(process.cwd(), "swagger.json");

  await writeFile(outputPath, JSON.stringify(document, null, 2), "utf8");
  await app.close();
}

generateSwagger().catch((error) => {
  console.error("Swagger 문서 생성 실패:", error);
  process.exitCode = 1;
});
