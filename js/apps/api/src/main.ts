import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api");
  const allowedOrigins = process.env.CORS_ORIGINS?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins?.length) {
    app.enableCors({ origin: allowedOrigins });
  }

  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
