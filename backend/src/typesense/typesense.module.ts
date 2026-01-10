import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InternalApiGuard } from "../common/guards/internal-api.guard";
import { TypesenseService } from "./typesense.service";
import { TypesenseAdminController } from "./typesense-admin.controller";
import { TypesenseIndexingService } from "./typesense-indexing.service";

@Module({
  imports: [ConfigModule],
  controllers: [TypesenseAdminController],
  providers: [TypesenseService, TypesenseIndexingService, InternalApiGuard],
  exports: [TypesenseService, TypesenseIndexingService],
})
export class TypesenseModule {}
