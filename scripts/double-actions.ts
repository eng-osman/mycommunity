#!ts-node
// tslint:disable: no-console
import { Redis } from 'ioredis';
import * as IORedis from 'ioredis';
import * as notepack from 'notepack.io';
import { zip } from 'ramda';
async function main(args: string[]) {
  const host = args[2];
  const pass = args[3];
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
  const ids: string[] = [];
  for (const status of statuses) {
    if (status.hasMedia && status.type === 'channelMedia') {
      ids.push(status.id);
    }
  }

  const pipeline2 = redisClient.pipeline();
  for (const id of ids) {
    pipeline2.hgetall(`status:${id}:counters`);
  }
  const result2: Array<[any, any]> = await pipeline2.exec();

  const pipeline3 = redisClient.pipeline();

  for (const [[err, counters], id] of zip(result2, ids)) {
    if (err || !counters) {
      continue;
    }
    pipeline3.hset(`status:${id}:counters`, 'likesCount', +counters.likesCount * 2 || 1);
    pipeline3.hset(`status:${id}:counters`, 'viewsCount', +counters.viewsCount * 2 || 4);
  }
  await pipeline3.exec();
  redisClient.disconnect();
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
