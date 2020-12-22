#!ts-node
// tslint:disable: no-console
import { Redis } from 'ioredis';
import * as IORedis from 'ioredis';
import * as mysql from 'mysql';
import * as notepack from 'notepack.io';
async function main(args: string[]) {
  const host = args[2];
  const pass = args[3];
  const dbUsername = args[4];
  const dbPassword = args[5];
  const dbName = args[6];
  const redisClient: Redis = new IORedis(6379, host, {
    db: 0,
    password: pass,
    name: 'Redis101',
    lazyConnect: true,
  });
  redisClient.on('connect', () => console.log('Connecting'));
  redisClient.on('ready', () => console.log('Connected'));
  redisClient.on('reconnecting', () => console.log('Reconnecting'));
  redisClient.on('end', () => console.warn('Ended'));
  redisClient.on('error', e => console.error(e.message, e));

  const keys = await redisClient.keys('status:*');
  const statuses: any[] = [];
  const pipeline = redisClient.pipeline();
  for (const key of keys) {
    pipeline.getBuffer(key);
  }
  const result = await pipeline.exec();
  for (const [err, rowStatus] of result) {
    if (err) {
      continue;
    }
    const status = await decode(rowStatus);
    statuses.push(status);
  }
  redisClient.disconnect();
  const data = statuses
    .filter(s => s.hasMedia)
    .map(s => ({ id: s.id, media: JSON.stringify(s.media) }));
  const connection = mysql.createConnection({
    host,
    user: dbUsername,
    password: dbPassword,
    database: dbName,
  });

  connection.connect(err => {
    if (err) {
      console.error('error connecting: ' + err.stack);
      return;
    }
    console.log('connected as id ' + connection.threadId);
  });
  for (const status of data) {
    connection.query(
      'UPDATE `com_user_status` SET `media` = ? WHERE `id` = ?;',
      [status.media, status.id],
      (e: any, _0: any, _1: any) => {
        if (e) {
          console.error(e);
          return;
        }
      },
    );
  }
  connection.end();
}

function decode<T = any>(buf: Buffer): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    try {
      const result = notepack.decode(buf) as T;
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

main(process.argv)
  .then(() => console.log('Done'))
  .catch(console.error);
