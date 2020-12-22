import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConstructorOptions } from 'eventemitter2';
import { createEventEmitterProviders } from './event-emitter.provider';

@Global()
@Module({})
export class EventEmitterModule {
  public static forRoot(options: ConstructorOptions): DynamicModule {
    const providers = createEventEmitterProviders(options);
    return { module: EventEmitterModule, providers, exports: providers };
  }
}
