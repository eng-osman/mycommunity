import { messaging } from 'firebase-admin';

export interface NotificationMessage {
  notification?: messaging.NotificationMessagePayload;

  token: string;
  topic?: string;
}
