import { Env } from '@shared/utils';
import * as winston from 'winston';
export class WinstonLogger {
  public static getInstance() {
    if (WinstonLogger.instance) {
      return WinstonLogger.instance;
    } else {
      const instance = new WinstonLogger();
      WinstonLogger.instance = instance;
      return instance;
    }
  }

  private static loggerOptions: winston.LoggerOptions = {
    levels: winston.config.npm.levels,
    transports: [
      new winston.transports.File({
        filename: Env('ERR_LOG_FILE', 'app.errors.log'),
        level: 'error',
      }),
      new winston.transports.File({
        filename: Env('LOG_FILE', 'app.dev.log'),
        level: 'info',
      }),
    ],
    exceptionHandlers: [
      new winston.transports.File({
        filename: Env('EXP_LOG_FILE', 'app.exceptions.log'),
      }),
    ],
  };

  private static instance: WinstonLogger | null = null;
  private logger: winston.Logger;
  private constructor() {
    this.logger = winston.createLogger(WinstonLogger.loggerOptions);
  }

  public getLogger() {
    return this.logger;
  }
}
