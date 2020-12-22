import { Message } from '@app/chat/interfaces/message.interface';
import { Status } from '@app/user-status/entities';
import { StatusAction } from '@app/user-status/status-actions.enum';

export interface FanActionMessage extends Partial<Message> {
  count: number;
  statusId?: string;
  actionType: StatusAction;
  isCommentOrReply: boolean;
  entity?: Status;
}
