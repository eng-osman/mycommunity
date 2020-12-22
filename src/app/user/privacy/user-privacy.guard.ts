import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JWTService } from '@shared/services';
import { User } from '../entities';
import { UserPrivacy } from './user-privacy.enum';
import { UserPrivacyService } from './user-privacy.service';

@Injectable()
export class UserPrivacyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JWTService,
    private readonly userPrivacyService: UserPrivacyService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (
      req.headers.authorization &&
      (req.headers.authorization as string).split(' ')[0] === 'Bearer'
    ) {
      try {
        const handler = context.getHandler();
        const { scope, fildName } = this.reflector.get<{
          scope: 'body' | 'query';
          fildName: string;
        }>('privacy', handler);
        if (!scope || !fildName) {
          return true;
        }
        const other = req[scope][fildName];
        if (!other) {
          throw new BadRequestException('The Other User Id must be provided');
        }
        const token = (req.headers.authorization as string).split(' ')[1];
        const currentUser: User = await this.jwtService.verifyToken<User>(token);
        if (currentUser) {
          const userPrivacy = await this.userPrivacyService.checkPrivacy(currentUser, other);
          if (userPrivacy === UserPrivacy.PROFILE || userPrivacy === UserPrivacy.ALL) {
            throw new ForbiddenException('You can not access this user');
          }
          return true;
        }
        return false;
      } catch (err) {
        throw err;
      }
    } else {
      throw new UnauthorizedException('Unauthorized: Missing User Token');
    }
  }
}
