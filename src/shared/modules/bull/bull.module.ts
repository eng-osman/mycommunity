import { DynamicModule, Global, Module } from '@nestjs/common';
import { BullModuleOptions } from './bull.interfaces';
import { createQueues } from './bull.providers';

@Global()
@Module({})
export class BullModule {
  public static forRoot(options: BullModuleOptions | BullModuleOptions[]): DynamicModule {
    const providers: any[] = createQueues(([] as any[]).concat(options));
    return {
      module: BullModule,
      providers,
      exports: providers,
    };
  }
}
