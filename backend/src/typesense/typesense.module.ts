import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { InternalApiGuard } from "../common/guards/internal-api.guard";
import { TypesenseAdminController } from "./typesense-admin.controller";
import { TypesenseIndexingService } from "./typesense-indexing.service";
import { TypesenseService } from "./typesense.service";

@Module({
  imports: [ConfigModule],
  controllers: [TypesenseAdminController],
  providers: [TypesenseService, TypesenseIndexingService, InternalApiGuard],
  exports: [TypesenseService, TypesenseIndexingService],
})
export class TypesenseModule {}
