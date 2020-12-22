import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { LoggerService } from '@shared/services';
import { QueryFailedError } from 'typeorm/error/QueryFailedError';

@Catch(QueryFailedError)
export class QueryError implements ExceptionFilter {
  private readonly logger: LoggerService = new LoggerService('QueryError');
  public catch(exception: QueryFailedError, host: ArgumentsHost) {
    this.logger.error(JSON.stringify(exception.message), exception);
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    Sentry.addBreadcrumb({ message: 'QueryError', type: '777' });
    Sentry.captureException(exception);
    return (
      response
        // tslint:disable-next-line:no-string-literal
        .json({ statusCode: 777, message: 'Database Error', errorCode: exception['errno'] })
        .status(HttpStatus.SERVICE_UNAVAILABLE)
    );
  }
}
