import { NotificationMessage } from './notification.message';

export interface StatusNotification extends NotificationMessage {
  data: {
    statusId: string;
    senderId: string;
    statusType: string;
    hasMedia: string;
    type: string;
  };
  condition: string;
}
