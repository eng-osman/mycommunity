export enum LogMode {
  DEVELOPMENT = 0,
  PRODUCTION,
  TESTING,
}
export interface LoggerMode {
  mode?: LogMode;
  context: string;
}
