import { Injectable, MiddlewareFunction, NestMiddleware } from '@nestjs/common';

const TIMEOUT_MS = 600e3;

@Injectable()
export class TimeoutMiddleware implements NestMiddleware {
  public resolve(..._args: any[]): MiddlewareFunction {
    return (req: any, res: any, next: any) => {
      // Set the timeout for all HTTP requests
      req.setTimeout(TIMEOUT_MS, () => {
        const err: any = new Error('Request Timeout');
        err.status = 408;
        next(err);
      });
      // Set the server response timeout for all HTTP requests
      res.setTimeout(TIMEOUT_MS, () => {
        const err: any = new Error('Service Unavailable');
        err.status = 503;
        next(err);
      });
      next();
    };
  }
}
