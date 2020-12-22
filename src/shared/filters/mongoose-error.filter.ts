import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { LoggerService } from '@shared/services';
import { Error } from 'mongoose';

@Catch(Error.ValidationError)
export class MongooseErrorFilter implements ExceptionFilter {
  private readonly logger: LoggerService = new LoggerService('MongooseErrorFilter');
  public catch(exception: Error.ValidationError, host: ArgumentsHost) {
    this.logger.error(JSON.stringify(exception.message), exception);
    Sentry.addBreadcrumb({ message: 'MongooseErrorFilter', type: '777' });
    Sentry.captureException(exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    return response
      .json({ statusCode: 777, message: 'Database Error' })
      .status(HttpStatus.SERVICE_UNAVAILABLE);
  }
}
