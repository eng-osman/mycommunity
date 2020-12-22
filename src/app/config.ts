import { Entities } from '@app/entities';
import { MongooseModuleOptions } from '@nestjs/mongoose';
import { DocumentBuilder } from '@nestjs/swagger';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { CreateRedisProvidersConfig } from '@shared/modules/redis/redis.providers';
import { Env } from '@shared/utils';
import { AgendaConfiguration } from 'agenda';
import { ConstructorOptions } from 'eventemitter2';
import { AppOptions, credential } from 'firebase-admin';
import { readFileSync } from 'fs';
import * as Mongoose from 'mongoose';
import { join } from 'path';

export const TypeORMCofig: TypeOrmModuleOptions = {
  type: Env('DB_TYPE', 'mariadb'),
  host: Env('DB_HOST', 'localhost'),
  port: parseInt(Env('DB_PORT', 3306)),
  username: Env('DB_USER', 'root'),
  password: Env('DB_PASSWORD', '123456'),
  database: Env('DB_NAME', 'db'),
  entities: Entities,
  entityPrefix: Env('DB_PREFIX', ''),
  charset: 'utf8mb4',
  keepConnectionAlive: true,
  timezone: 'Z',
  flags: ['max_allowed_packet=50M'],
  logging: Env('NODE_ENV', 'dev') === 'dev' ? ['warn', 'info', 'error'] : ['error'],
  logger: 'advanced-console',
  cache: {
    type: 'redis',
    options: {
      host: Env('REDIS_HOST', 'localhost'),
      port: parseInt(Env('REDIS_PORT', 6379)),
      password: Env('REDIS_PASSWORD'),
    },
  },
  synchronize: true,
};

Mongoose.set('useCreateIndex', true);
export const MongooseConfig: MongooseModuleOptions = {
  pass: Env('MONGODB_PASSWORD'),
  user: Env('MONGODB_USER'),
  reconnectTries: 10,
  reconnectInterval: 1000,
  useNewUrlParser: true,
  retryAttempts: 50,
};

export const MongoseURL = `mongodb://${Env('MONGODB_HOST')}:${parseInt(Env('MONGODB_PORT'))}/${Env(
  'MONGODB_NAME',
)}`;

export const AgendaMongoURL = `mongodb://${Env('MONGODB_USER')}:${Env('MONGODB_PASSWORD')}@${Env(
  'MONGODB_HOST',
)}:${parseInt(Env('MONGODB_PORT'))}/${Env('MONGODB_NAME')}`;

export const AgendaConfig: AgendaConfiguration = {
  db: {
    address: AgendaMongoURL,
    collection: 'agenda_jobs',
    options: {
      useNewUrlParser: true,
      reconnectTries: 10,
    },
  },
  processEvery: 10e3,
};

export const RedisConfig: CreateRedisProvidersConfig = {
  host: Env('REDIS_HOST', 'localhost'),
  port: parseInt(Env('REDIS_PORT', 6379)),
  auth_pass: Env('REDIS_PASSWORD'),
  db_index: parseInt(Env('REDIS_DB', 0)),
};

export const EventEmitterConfig: ConstructorOptions = {
  maxListeners: 100,
  wildcard: true,
  delimiter: ':',
};
const pem = readFileSync(join(process.cwd(), Env('FIREBASE_PRIVATE_KEY_LOCATION')), 'utf8');
export const FirebaseConfig: AppOptions = {
  credential: credential.cert({
    projectId: Env('FIREBASE_PROJECT_ID'),
    privateKey: pem,
    clientEmail: Env('FIREBASE_CLIENT_EMAIL'),
  }),
};
export const SwaggerOptions = new DocumentBuilder()
  .setTitle('KLLIQ | API Documention')
  .setDescription('This a alpha version of API Documention')
  .setVersion('1.4')
  .setSchemes('https', 'http')
  .setContactEmail('shekohex@gmail.com')
  .setBasePath('/api/v1')
  .addBearerAuth('Authorization', 'header')
  .addTag('User', 'the User entity')
  .addTag('Authentication', 'Authorization and Authentication Process')
  .addTag('Contacts', 'the Relations between users')
  .addTag('Status', 'the Status entity')
  .addTag('Media', 'the Media entity')
  .addTag('Timeline', 'Users Timeline')
  .addTag('Notifications', 'Users Notifications')
  .addTag('Live Video', 'Live Streaming')
  .addTag('User Help', 'Users Help each other')
  .addTag('Analytics', 'User Data Statics and Analysis')
  .addTag('Advertisement', 'the Advertisement Entity')
  .addTag('Payment', 'the Payment Entity')
  .addTag('TechnicalSupport', 'Sending Messages to tech support')
  .addTag('Reports', 'Report a User or a Status')
  .addTag('StaticFiles', 'Recent uploaded Static files (video, image)')
  .addTag('ApplicationSettings', 'Application Settings')
  .addTag('Debugging', 'Only For Development')
  .build();
