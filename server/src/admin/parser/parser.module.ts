import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { ParserController } from "./parser.controller";
import { ParserService } from "./parser.service";

@Module({
  imports: [PrismaModule],
  controllers: [ParserController],
  providers: [ParserService],
  exports: [ParserService],
})
export class ParserModule {}
