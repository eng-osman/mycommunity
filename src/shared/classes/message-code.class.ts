import { getMessageFromMessageCode } from '../utils';

export class MessageCodeError extends Error {
  public readonly httpStatus: number;
  public readonly errorMessage: string;
  public readonly errorCode: number;
  constructor(messageCode: string) {
    super();
    const errorMessageConfig = getMessageFromMessageCode(messageCode);
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.httpStatus = errorMessageConfig.httpStatus;
    this.errorMessage = errorMessageConfig.errorMessage;
    this.errorCode = errorMessageConfig.errorCode;
  }
}
