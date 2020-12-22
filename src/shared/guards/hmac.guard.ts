import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { isNil } from 'ramda';
import { HmacService } from '../services';

@Injectable()
export class HmacGuard implements CanActivate {
  constructor(private readonly hmacService: HmacService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const headerSignature = req.headers['x-signature'];
    if (!isNil(headerSignature)) {
      try {
        const dateStr = req.headers.Date;
        const reqTs = new Date(dateStr).getTime();
        const currentTs = new Date().getTime();
        const diff = currentTs - reqTs;
        if (diff > 10e3) {
          // Old Signature
          return false;
        }
        const serverSignature = await this.hmacService.calculateHmac(dateStr);
        const clientSignature = Buffer.from(headerSignature);
        return this.hmacService.verifySignature(clientSignature, serverSignature);
      } catch (err) {
        throw err;
      }
    } else {
      throw new UnauthorizedException();
    }
  }
}
