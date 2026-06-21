import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminPageModule } from "./admin-page/admin-page.module";
import { ParserModule } from "./admin/parser/parser.module";
import { QueueModule } from "./admin/queue/queue.module";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminPageModule,
    PrismaModule,
    ParserModule,
    QueueModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
