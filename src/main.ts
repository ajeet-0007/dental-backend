import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as express from "express";
import { Request, Response, NextFunction } from "express";
import * as uuid from "uuid";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./modules/logger/filters/all-exceptions.filter";
import { LogService } from "./modules/logger/logger.service";

async function bootstrap() {

  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bodyParser: false,
  });

  app.use("/api/payments/webhook", express.raw({ type: "application/json" }));

  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    (req as any).correlationId = (req.headers['x-correlation-id'] as string) || uuid.v4();
    res.setHeader('x-correlation-id', (req as any).correlationId);
    next();
  });

  app.enableCors({
    origin: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.setGlobalPrefix("api");

  const logService = app.get(LogService);
  app.useGlobalFilters(new AllExceptionsFilter(logService));

  const config = new DocumentBuilder()
    .setTitle("Dentalkart API")
    .setDescription("Dentalkart E-commerce API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || "0.0.0.0";

  await app.listen(port, host);
}
bootstrap().catch((err) => {
  console.error("❌ Failed to start server:", err);
  process.exit(1);
});
