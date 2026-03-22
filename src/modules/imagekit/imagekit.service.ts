import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

@Injectable()
export class ImageKitService {
  constructor(private configService: ConfigService) {}

  getPublicKey(): string {
    return this.configService.get<string>("IMAGEKIT_PUBLIC_KEY") || "";
  }

  getPrivateKey(): string {
    return this.configService.get<string>("IMAGEKIT_PRIVATE_KEY") || "";
  }

  getUrlEndpoint(): string {
    return this.configService.get<string>("IMAGEKIT_URL_ENDPOINT") || "";
  }

  getAuthParams(): { token: string; expire: number; signature: string } {
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 3500;
    const privateKey = this.getPrivateKey();

    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex");

    return {
      token,
      expire,
      signature,
    };
  }
}
