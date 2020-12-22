import { DynamicModule, Global, Module } from '@nestjs/common';
import { AgendaConfiguration } from 'agenda';
import { createAgendaProviders } from './agenda.providers';

@Global()
@Module({})
export class AgendaModule {
  public static forRoot(config: AgendaConfiguration): DynamicModule {
    const providers = createAgendaProviders(config);
    return { module: AgendaModule, providers, exports: providers };
  }
}
