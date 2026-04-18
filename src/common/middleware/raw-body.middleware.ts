import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class RawBodyMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const isWebhook = req.originalUrl === "/api/payments/webhook";

    if (isWebhook) {
      const chunks: Buffer[] = [];

      req.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      req.on("end", () => {
        const rawBody = Buffer.concat(chunks);
        (req as any).rawBody = rawBody;
        next();
      });

      req.on("error", (err) => {
        next(err);
      });
    } else {
      next();
    }
  }
}