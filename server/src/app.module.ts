import { Module } from "@nestjs/common";
import { ApiController } from "./api.controller";
import { PrismaService } from "./prisma.service";
import { ShopService } from "./shop.service";

@Module({
  controllers: [ApiController],
  providers: [PrismaService, ShopService],
})
export class AppModule {}
