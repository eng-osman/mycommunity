import { time } from '@shared/utils';
import { Redis } from 'ioredis';
import * as notepack from 'notepack.io';
export class CacheMaker<T = any> {
  constructor(protected readonly client: Redis, protected namespace: string) {}

  public async deleteCache(key: string): Promise<boolean> {
    return (await this.client.del(this.formatKey(key))) === 1;
  }
  public async extendExpiration(key: string | any[], expiration: string): Promise<boolean> {
    return Boolean(this.client.expire(this.formatKey(key), time(expiration)));
  }
  public async clearExpiration(key: string): Promise<boolean> {
    return Boolean(this.client.persist(this.formatKey(key)));
  }
  protected formatKey(...ids: any[]): string {
    return this.namespace.concat(':', ids.join(':'));
  }
  protected encode(object: T): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const result = notepack.encode(object) as Buffer;
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }

  protected decode(buf: Buffer): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      try {
        const result = notepack.decode(buf) as T;
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  }
}
