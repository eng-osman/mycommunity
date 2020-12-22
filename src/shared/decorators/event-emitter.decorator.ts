import { Inject } from '@nestjs/common';

import { EVENT_EMITTER_TOKEN } from '../modules/event-emitter/event-emitter.provider';

export const InjectEventEmitter = () => Inject(EVENT_EMITTER_TOKEN);
