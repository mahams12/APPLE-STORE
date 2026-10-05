import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { HttpFilter } from "./http.filter";

export async function startServer() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());
  app.enableCors({ origin: process.env.APP_URL || "http://localhost:3456", credentials: true });
  app.useGlobalFilters(new HttpFilter());
  const config = new DocumentBuilder().setTitle("I.STORE API").setDescription("Store API for products, cart, checkout, and admin.").setVersion("1").build();
  SwaggerModule.setup("docs", app, SwaggerModule.createDocument(app, config));
  await app.listen(Number(process.env.API_PORT) || 4000);
  console.log(`I.STORE API listening on ${process.env.API_PORT || 4000}`);
}
