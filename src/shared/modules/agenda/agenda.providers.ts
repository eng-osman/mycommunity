import { AgendaConfiguration } from 'agenda';
import * as Agenda from 'agenda';
import { LoggerService } from '../../services';
const logger = new LoggerService('AgendaModule');
export const AGENDA_TOKEN = '__agenda__';
export function createAgendaProviders(config: AgendaConfiguration) {
  const agendaProvider = {
    provide: AGENDA_TOKEN,
    useFactory: async () => {
      try {
        const agenda: Agenda = new Agenda(config);
        agenda.on('error', e => logger.error(e.message, e));
        return agenda;
      } catch (error) {
        logger.error(error.message, error);
        throw error;
      }
    },
  };
  return [agendaProvider];
}
