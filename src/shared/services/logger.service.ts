import * as chalk from 'chalk';
import { isNil } from 'ramda';
import { inspect } from 'util';
import { WinstonLogger } from './winston.service';

export class LoggerService {
  private static logger = WinstonLogger.getInstance().getLogger();
  constructor(private context: string) {}
  get Logger() {
    return LoggerService.logger;
  }

  public async readLogs(limit: any = 30, page: any = 0, fields?: string[], level?) {
    page = page || 1;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    return new Promise((resolve, reject) => {
      this.Logger.query(
        { fields, level, rows: Infinity } as any,
        (error, result: { file: any[] }) => {
          if (error) {
            this.error(error.message, error);
            reject(null);
          } else if (isNil(result.file) || !Array.isArray(result.file)) {
            reject(null);
          } else {
            const logs = result.file.slice(offset, offset + parseInt(limit));
            const res = {
              statusCode: 200,
              logs,
              totalLogs: result.file.length,
              totalPages: Math.floor(result.file.length / parseInt(limit)) + 1,
              shouldIncreaseLimit: result.file.length > logs.length,
            };
            resolve(res);
          }
        },
      );
    });
  }

  public log(message: string): void {
    const currentDate = new Date();
    this.Logger.info(message, {
      timestamp: currentDate.toISOString(),
      context: this.context,
    });
    this.formatedLog('info', message);
  }

  public logDebug(...args: any[]): void {
    /* tslint:disable */
    console.group(`Debug [${this.context}]`);
    console.log(...args);
    console.groupEnd();
    const currentDate = new Date();
    this.Logger.debug('Debug', {
      timestamp: currentDate.toISOString(),
      context: this.context,
      ...args,
    });
    /* tslint:enable */
  }

  public error(message: string, trace?: any): void {
    const currentDate = new Date();
    const traceString = inspect(trace, {
      breakLength: 100,
      maxArrayLength: 15,
      depth: 5,
      colors: false,
    });
    this.Logger.error(`${message}`, {
      timestamp: currentDate.toISOString(),
      context: this.context,
      trace: traceString || 'trace not provided !',
    });
    this.formatedLog('error', message, traceString);
  }

  public warn(message: string): void {
    const currentDate = new Date();
    this.Logger.warn(message, {
      timestamp: currentDate.toISOString(),
      context: this.context,
    });
    this.formatedLog('warn', message);
  }

  private formatedLog(level: string, message: string, error?): void {
    let result = '';
    const color = chalk.default;
    const currentDate = new Date();
    // tslint:disable-next-line:max-line-length
    const time = `${currentDate.getHours()}:${currentDate.getMinutes()}:${currentDate.getSeconds()}`;

    switch (level) {
      case 'info':
        result = `[${color.blue('INFO')}] ${color.dim.yellow.bold.underline(time)} [${color.green(
          this.context,
        )}] ${message}`;
        break;
      case 'error':
        result = `[${color.red('ERR')}] ${color.dim.yellow.bold.underline(time)} [${color.green(
          this.context,
        )}] ${message}, See log file (app.errors.log) for long trace`;
        break;
      case 'warn':
        result = `[${color.yellow('WARN')}] ${color.dim.yellow.bold.underline(time)} [${color.green(
          this.context,
        )}] ${message}`;
        break;
      default:
        break;
    }
    if (error) {
      // tslint:disable-next-line:no-console
      console.error(result);
    } else {
      // tslint:disable-next-line:no-console
      console.log(result);
    }
  }
}
