import { Env } from '@shared/utils';
import * as crypto from 'crypto';
export class HmacService {
  private static readonly hmacKey = Buffer.from(Env('HMAC_KEY', ''));
  private hmacSha256: crypto.Hmac;

  public async calculateHmac(data: Buffer) {
    return new Promise<Buffer>((resolve, _) => {
      this.hmacSha256 = crypto.createHmac('sha256', HmacService.hmacKey);
      this.hmacSha256.update(data);
      const output = this.hmacSha256.digest();
      resolve(output);
    });
  }

  public verifySignature(clientSignature: Buffer, serverSignature: Buffer): boolean {
    const isOk = crypto.timingSafeEqual(clientSignature, serverSignature);
    return isOk;
  }
}
