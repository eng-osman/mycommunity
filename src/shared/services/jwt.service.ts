import { MessageCodeError } from '@shared/classes';
import { LoggerService } from '@shared/services';
import { Env } from '@shared/utils';
import * as jwt from 'jsonwebtoken';
export class JWTService {
  private readonly logger: LoggerService = new LoggerService('JWTService');
  private defaultOptions: jwt.SignOptions = {
    algorithm: 'HS256',
    expiresIn: '365d',
    jwtid: Env('JWT_ID') || '',
  };
  get options(): jwt.SignOptions {
    return this.defaultOptions;
  }
  set options(value: jwt.SignOptions) {
    this.defaultOptions = value;
  }

  public async verifyToken<T = any>(token: string): Promise<T> {
    try {
      return (await jwt.verify(token, Env('JWT_KEY'))) as any;
    } catch (error) {
      this.logger.error(error.message, error);
      throw new MessageCodeError('AUTH.BAD_TOKEN');
    }
  }

  public async decodeToken<T = any>(token: string): Promise<T> {
    try {
      return (await jwt.decode(token)) as any;
    } catch (error) {
      this.logger.error(error.message, error);
      throw new MessageCodeError('AUTH.BAD_TOKEN');
    }
  }

  public async signToken<T = any>(payload: T): Promise<string> {
    try {
      return await jwt.sign(payload as any, Env('JWT_KEY'), this.defaultOptions);
    } catch (error) {
      this.logger.error(error.message, error);
      throw new MessageCodeError('AUTH.TOKEN_ERROR');
    }
  }
}
