import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpFilter } from "./http.filter";
import { assertProductionDatabase, loadConfig } from "./config";
import { RedisService } from "./redis/redis.service";
import { JobsService } from "./jobs/jobs.service";
import { logInfo } from "./logger";

export async function startServer() {
  assertProductionDatabase();
  const cfg = loadConfig();

  const app = await NestFactory.create(AppModule);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({ origin: cfg.appUrl, credentials: true });
  app.useGlobalFilters(new HttpFilter());

  const redis = app.get(RedisService);
  await redis.connect(cfg.redisUrl);

  const jobs = app.get(JobsService);
  await jobs.start();

  const config = new DocumentBuilder()
    .setTitle("I.STORE API")
    .setDescription("Store API for products, cart, checkout, and admin.")
    .setVersion("1")
    .build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));

  await app.listen(cfg.apiPort);
  logInfo("api.listening", {
    port: cfg.apiPort,
    env: process.env.NODE_ENV || "development",
    paymentProvider: cfg.paymentProvider,
    redis: redis.isReady(),
    s3: !!cfg.s3,
    smtp: !!cfg.smtp,
  });
  console.log(`I.STORE API listening on ${cfg.apiPort}`);
}
