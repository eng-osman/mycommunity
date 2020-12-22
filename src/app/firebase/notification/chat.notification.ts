import { NotificationMessage } from './notification.message';

export interface ChatNotification extends NotificationMessage {
  data: {
    conversationId: string;
    senderId: string;
    profilePic?: any;
    content: string;
    hasMedia: string;
    type: string;
  };
  condition: string;
}
