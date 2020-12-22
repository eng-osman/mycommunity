import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums';
import { IErrorMessages } from '../interfaces';

export const errorMessages: { [messageCode: string]: IErrorMessages } = {
  'AUTH.BAD_TOKEN': {
    errorCode: ErrorCode.BAD_TOKEN,
    errorMessage: 'The Token you provided seems to be invalid or expired, please login again.',
    httpStatus: HttpStatus.UNAUTHORIZED,
    type: 'BAD_TOKEN',
  },
  'AUTH.TOKEN_ERROR': {
    errorCode: ErrorCode.TOKEN_ERROR,
    errorMessage: 'There is an error while creating your token, please try again.',
    httpStatus: HttpStatus.EXPECTATION_FAILED,
    type: 'TOKEN_ERROR',
  },
  'USER.EMAIL_EXISTS': {
    errorCode: ErrorCode.EMAIL_EXISTS,
    errorMessage: 'Email is already registered, please try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
    type: 'EMAIL_EXISTS',
  },
  'USER.MOBILE_EXISTS': {
    errorCode: ErrorCode.MOBILE_EXISTS,
    errorMessage: 'Mobile is already registered, please try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
    type: 'MOBILE_EXISTS',
  },
  'USER.USERNAME_EXISTS': {
    errorCode: ErrorCode.USERNAME_EXISTS,
    errorMessage: 'Username is already registered, please try again.',
    httpStatus: HttpStatus.BAD_REQUEST,
    type: 'USERNAME_EXISTS',
  },
  'APP.SERVER_ERROR': {
    errorCode: ErrorCode.SERVER_ERROR,
    errorMessage: 'There is an error with our servers, please try again later.',
    httpStatus: HttpStatus.INTERNAL_SERVER_ERROR,
    type: 'SERVER_ERROR',
  },
  'APP.NEXMO_ERROR': {
    errorCode: ErrorCode.NEXMO_ERROR,
    errorMessage: 'There is an error while trying to verify your mobile.',
    httpStatus: HttpStatus.EXPECTATION_FAILED,
    type: 'NEXMO_ERROR',
  },
  'APP.TWILIO_ERROR': {
    errorCode: ErrorCode.TWILIO_ERROR,
    errorMessage: 'There is an error while trying to verify your mobile.',
    httpStatus: HttpStatus.EXPECTATION_FAILED,
    type: 'TWILIO_ERROR',
  },
  'CHAT.BAD_PAYLOAD': {
    errorCode: ErrorCode.BAD_PAYLOAD,
    errorMessage:
      'The Payload you provided seems to be invalid, please try again with valid payload.',
    httpStatus: HttpStatus.BAD_REQUEST,
    type: 'BadPayload',
  },
  'CHAT.USER_NOT_FOUND': {
    errorCode: ErrorCode.USER_NOT_FOUND,
    errorMessage: `The server could not find your information.
      did you logged in in 'auth' namespace ?
      if not, please try handshaking again.`,
    httpStatus: HttpStatus.UNAUTHORIZED,
    type: 'UserNotFound',
  },
  'CHAT.UNAUTHORIZED': {
    errorCode: ErrorCode.UNAUTHORIZED,
    errorMessage: `Do I know you ? please Reconnect to 'auth' namespace wiht valid token`,
    httpStatus: HttpStatus.UNAUTHORIZED,
    type: 'UserNotFound',
  },
  'CHAT.NOT_CONVERSATION_ADMIN': {
    errorCode: ErrorCode.NOT_CONVERSATION_ADMIN,
    errorMessage: `Sorry You are not a Conversation Admin`,
    httpStatus: HttpStatus.FORBIDDEN,
    type: 'Forbidden',
  },
};

/**
 * @description: Find the error config by the given message code.
 * @param {string} messageCode
 * @return {IErrorMessages}
 */
export function getMessageFromMessageCode(messageCode: string): IErrorMessages {
  let errorMessageConfig: IErrorMessages | undefined;
  Object.keys(errorMessages).some(key => {
    if (key === messageCode) {
      errorMessageConfig = errorMessages[key];
      return true;
    }
    return false;
  });

  if (!errorMessageConfig) {
    throw new Error('Unable to find the given message code error.');
  }
  return errorMessageConfig;
}
