/*
 *--------------------------------------------------------------
 *  Copyright 2018-2019 (c) Shady Khalifa (@shekohex).
 *  All rights reserved.
 *-------------------------------------------------------------
 */
import 'reflect-metadata';
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
import { FirebaseServiceProvider } from '@app/firebase/firebase-service.provider';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { DispatchError, QueryError, WsDispatchError } from '@shared/filters';
import { DateTimeInterceptor, TransformInterceptor } from '@shared/interceptors';
import { LoggerService } from '@shared/services';
import { Env } from '@shared/utils';
import { json, raw, urlencoded } from 'body-parser';
import * as express from 'express';
import * as morgan from 'morgan';

declare const module: any;

process.setMaxListeners(2000);
const logger = new LoggerService('Main');
let firebaseService: FirebaseServiceProvider;
async function bootstrap() {
  const instance = express();
  instance.use(json({ limit: '5mb' }));
  instance.use(urlencoded({ limit: '5mb', extended: true, parameterLimit: 15000 }));
  instance.use(raw({ limit: '15mb' }));
  instance.use('/public/uploads', express.static('public/uploads'));
  instance.use(morgan('[:date[iso]] :method :url :status - :response-time ms'));
  const app = await NestFactory.create(AppModule, instance, {
    logger,
    bodyParser: false,
  });
  const port = parseInt(Env('SERVER_PORT', 3000), 10);
  const document = SwaggerModule.createDocument(app, SwaggerOptions);
  SwaggerModule.setup('/docs', app, document);
  firebaseService = app.get(FirebaseServiceProvider, { strict: false });
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => {
      firebaseService.currentApp
        .delete()
        .then(() => logger.log('Removing Current Firebase App..'))
        .then(() => (firebaseService.isAppDeleted = true))
        .then(() => logger.log('Firebase App Removed..'))
        .then(() => logger.log('Restarting Application..'))
        .then(() => app.close())
        .then(() => logger.warn('Application Restarted.'));
    });
  }
  await app
    .useGlobalPipes(new ValidationPipe({ transform: true }))
    .useGlobalInterceptors(new DateTimeInterceptor(), new TransformInterceptor())
    .useGlobalFilters(new QueryError(), new WsDispatchError(), new DispatchError())
    .setGlobalPrefix('/api/v1')
    .disable('x-powered-by')
    .disable('etag')
    .enableCors()
    .listen(port);
  return port;
}
bootstrap()
  .then(port => logger.log(`Server Started on Port ${port}`))
  .catch(e => logger.error(e.message, e));
