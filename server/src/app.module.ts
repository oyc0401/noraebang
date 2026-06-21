import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ParserModule } from "./admin/parser/parser.module";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    ParserModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
