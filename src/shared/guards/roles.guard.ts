import { User } from '@app/user/entities/user.entity';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums';
import { JWTService } from '../services';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwtService: JWTService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    // check if decorator is present with permissions
    const handler = context.getHandler();
    const roles = this.reflector.get<Role[]>('roles', handler);
    if (!roles) {
      // route without the @Role decorator, so no roles are required
      return true;
    } else {
      if (
        req.headers.authorization &&
        (req.headers.authorization as string).split(' ')[0] === 'Bearer'
      ) {
        try {
          // validate token
          const token = (req.headers.authorization as string).split(' ')[1];
          const currentUser = await this.jwtService.verifyToken<User>(token);
          // validate permissions
          const userHasRole = () =>
            !!currentUser.roles.find(role => !!roles.find(item => item === role));
          return userHasRole();
        } catch (err) {
          throw new UnauthorizedException('You do not have authorized roles to do this action');
        }
      } else {
        return false;
      }
    }
  }
}
