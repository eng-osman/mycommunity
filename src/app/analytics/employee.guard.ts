import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JWTService } from '@shared/services';

@Injectable()
export class EmployeeGuard implements CanActivate {
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
        const currentEmployee = await this.jwtService.decodeToken(token);
        if (currentEmployee.isAgent) {
          req.employee = currentEmployee;
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
