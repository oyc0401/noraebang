import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminPageModule } from "./admin-page/admin-page.module";
import { HealthModule } from "./api/health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminPageModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
