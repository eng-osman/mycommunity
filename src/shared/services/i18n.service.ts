import { LoggerService } from '@shared/services';
import * as i18n from 'i18n';
import { join } from 'path';
export class I18nService {
  private readonly logger = new LoggerService(I18nService.name);
  constructor() {
    i18n.configure({
      locales: ['en', 'ar'],
      defaultLocale: 'en',
      directory: join(process.cwd(), 'locales'),
      updateFiles: false,
      logDebugFn: msg => this.logger.logDebug(msg),
      logWarnFn: msg => this.logger.warn(msg),
      logErrorFn: err => this.logger.error(err),
    });
  }

  public setLocale(locale: string) {
    i18n.setLocale(locale);
  }

  public translate(key: string, ...args: string[]) {
    return i18n.__(key, ...args);
  }

  public translateN(key: string, count: number) {
    return i18n.__n(key, count);
  }
}
