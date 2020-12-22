import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { ErrorCode } from '@shared/enums';
import { LoggerService } from '@shared/services';
import { Response } from 'express';
import { MessageCodeError } from '../classes';
@Catch(MessageCodeError)
export class DispatchError implements ExceptionFilter {
  private readonly logger: LoggerService = new LoggerService('ErrorReporter');
  public catch(exception: MessageCodeError, host: ArgumentsHost) {
    const res: Response = host.switchToHttp().getResponse();
    res.setHeader('x-error-code', exception.errorCode);
    res.setHeader('x-error-message', exception.errorMessage);
    res.setHeader('x-http-status', exception.httpStatus);
    this.logger.error(exception.errorMessage, exception);
    if (
      exception.httpStatus === HttpStatus.INTERNAL_SERVER_ERROR ||
      exception.errorCode === ErrorCode.NEXMO_ERROR ||
      res.statusCode === HttpStatus.INTERNAL_SERVER_ERROR
    ) {
      Sentry.addBreadcrumb({ message: exception.errorMessage, type: exception.errorMessage });
      Sentry.captureException(exception);
    }
    return res.status(exception.httpStatus).json({
      errorCode: exception.errorCode,
      message: exception.errorMessage,
      statusCode: exception.httpStatus,
    });
  }
}
