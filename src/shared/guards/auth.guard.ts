import { User } from '@app/user/entities';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JWTService } from '../services';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JWTService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (
      req.headers.authorization &&
      (req.headers.authorization as string).split(' ')[0] === 'Bearer'
    ) {
      try {
        // validate token
        const token = (req.headers.authorization as string).split(' ')[1];
        const currentUser: User = await this.jwtService.verifyToken<User>(token);
        if (currentUser.email) {
          req.user = currentUser;
          return true;
        } else {
          return false;
        }
      } catch (err) {
        throw err;
      }
    } else {
      throw new UnauthorizedException();
    }
  }
}
