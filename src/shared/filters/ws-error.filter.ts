import { EXCEPTION_EVENT } from '@app/constants';
import { Catch } from '@nestjs/common';
import { ArgumentsHost, WsExceptionFilter } from '@nestjs/common/interfaces';
import { WsMessageException } from '@shared/excepion';
import { LoggerService } from '@shared/services';
@Catch(WsMessageException)
export class WsDispatchError implements WsExceptionFilter<WsMessageException> {
  private readonly logger: LoggerService = new LoggerService('WsDispatchErrorFilter');
  public catch(exception: WsMessageException, host: ArgumentsHost) {
    const ctx = host.switchToWs();
    const client = ctx.getClient();
    const error = exception.getError();
    this.logger.error(error.errorMessage, exception);
    client.emit(EXCEPTION_EVENT, {
      errorCode: error.errorCode,
      errorMessage: error.errorMessage,
      status: error.httpStatus,
    });
  }
}
