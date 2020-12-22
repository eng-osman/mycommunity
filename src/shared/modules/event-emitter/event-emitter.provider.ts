import { ConstructorOptions, EventEmitter2 } from 'eventemitter2';
import { LoggerService } from '../../services';
const logger = new LoggerService('EventEmitterModule');
export const EVENT_EMITTER_TOKEN = '__event_emitter__';
export function createEventEmitterProviders(config?: ConstructorOptions) {
  const eventEmitterProvider = {
    provide: EVENT_EMITTER_TOKEN,
    useFactory: async () => {
      try {
        const emitter: EventEmitter2 = new EventEmitter2(config);
        emitter.on('error', e => logger.error(e.message, e));
        return emitter;
      } catch (error) {
        logger.error(error.message, error);
        throw error;
      }
    },
  };
  return [eventEmitterProvider];
}
