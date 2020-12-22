import { WsException } from '@nestjs/websockets';
import { IErrorMessages } from '@shared/interfaces';
import { getMessageFromMessageCode } from '@shared/utils';

export class WsMessageException extends WsException {
  private errorMessage: IErrorMessages;
  constructor(error: string, ...info: any[]) {
    const errorMessageConfig = getMessageFromMessageCode(error);
    errorMessageConfig.info = info;
    super(errorMessageConfig);
    this.errorMessage = errorMessageConfig;
  }
  public getError() {
    return this.errorMessage;
  }
}
