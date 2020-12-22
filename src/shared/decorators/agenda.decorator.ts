import { Inject } from '@nestjs/common';

import { AGENDA_TOKEN } from '../modules/agenda/agenda.providers';

export const InjectAgenda = () => Inject(AGENDA_TOKEN);
