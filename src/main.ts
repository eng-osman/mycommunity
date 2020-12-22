/*
 *--------------------------------------------------------------
 *  Copyright 2018-2019 (c) Shady Khalifa (@shekohex).
 *  All rights reserved.
 *-------------------------------------------------------------
 */
import 'reflect-metadata';
import 'source-map-support/register';
// Patch TypeORM to workaround https://github.com/typeorm/typeorm/issues/3636
import TypeORMMysqlDriver = require('typeorm/driver/mysql/MysqlDriver');
const OriginalNormalizeType = TypeORMMysqlDriver.MysqlDriver.prototype.normalizeType;
TypeORMMysqlDriver.MysqlDriver.prototype.normalizeType = column => {
  if (column.type === 'json') {
    return 'longtext';
  }
  return OriginalNormalizeType(column);
};
import { AppModule } from '@app/app.module';
import { SwaggerOptions } from '@app/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as Sentry from '@sentry/node';
import { DispatchError, QueryError, WsDispatchError } from '@shared/filters';
import { DateTimeInterceptor, TransformInterceptor } from '@shared/interceptors';
import { LoggerService } from '@shared/services';
import { Env } from '@shared/utils';
import { json, raw, urlencoded } from 'body-parser';
import * as express from 'express';
import { writeFileSync } from 'fs';
import * as morgan from 'morgan';

const logger = new LoggerService('Main');
async function bootstrap() {
  const instance = express();
  // Start Sentry
  Sentry.init({ dsn: Env('SENTRY_DSN'), attachStacktrace: true, serverName: 'MyCommuinty' });
  // TODO: Edit these limits !
  instance.use(Sentry.Handlers.requestHandler());
  instance.use(json({ limit: '15mb' }));
  instance.use(urlencoded({ limit: '15mb', extended: true, parameterLimit: 15000 }));
  instance.use(raw({ limit: '50mb' }));
  instance.use('/public/uploads', express.static('public/uploads'));
  instance.use(Sentry.Handlers.errorHandler());
  instance.use(morgan('[:date[iso]] :method :url :status - :response-time ms'));
  const app = await NestFactory.create(AppModule, instance, {
    logger,
    bodyParser: false,
  });
  const port = parseInt(Env('SERVER_PORT', 3000), 10);
  const document = SwaggerModule.createDocument(app, SwaggerOptions);
  SwaggerModule.setup('/docs', app, document);
  await app
    .useGlobalPipes(new ValidationPipe({ transform: true }))
    .useGlobalInterceptors(new DateTimeInterceptor(), new TransformInterceptor())
    .useGlobalFilters(new QueryError(), new WsDispatchError(), new DispatchError())
    .setGlobalPrefix('/api/v1')
    .disable('x-powered-by')
    .disable('etag')
    .listen(port);
  writeFileSync(process.cwd() + '/docs/api.json', JSON.stringify(document, null, 2));
  return port;
}
bootstrap()
  .then(port => logger.log(`Server Started on Port ${port}`))
  .catch(e => logger.error(e.message, e));
