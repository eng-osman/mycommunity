import { CacheMaker } from '@shared/classes';
import { InjectRedisClient } from '@shared/decorators';
import { Redis } from 'ioredis';

export class VerificationCacheService extends CacheMaker<any> {
  private static readonly namespace: string = 'verification';
  constructor(@InjectRedisClient() protected readonly client: Redis) {
    super(client, VerificationCacheService.namespace);
  }
  public async addTestNumber(mobileNumber: string) {
    const key = this.formatKey('testAcounts');
    await this.client.sadd(key, mobileNumber);
  }
  public async removeTestNumber(mobileNumber: string) {
    const key = this.formatKey('testAcounts');
    await this.client.srem(key, mobileNumber);
  }
  public async getTestNumbers(): Promise<string[]> {
    const key = this.formatKey('testAcounts');
    const testNumbers = await this.client.smembers(key);
    if (!testNumbers) {
      return [];
    } else {
      return testNumbers;
    }
  }
  public async isTestNumber(mobileNumber: string) {
    const key = this.formatKey('testAcounts');
    return (await this.client.sismember(key, mobileNumber)) ? true : false;
  }
}
