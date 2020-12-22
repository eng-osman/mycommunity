import { generateUnique, MulterConfig } from '@shared/utils';

/**
 * TOKENS , Used In factory injection
 */

// Redis Token
export const REDIS_TOKEN = 'RedisProvider';

// Publisher Token
export const PUB_REDIS_TOKEN = 'PubRedisProvider';

// Subscriber Token
export const SUB_REDIS_TOKEN = 'SubRedisProvider';

/**
 * EVENTS, Shared between client and server
 */

export const EXCEPTION_EVENT = 'app.serverException';
export const INTERNAL_SERVER_ERROR = 'app.serverInternalError';
// Auth Messages
export const AUTH_MESSAGE = {
  AUTHENTICATE: 'auth.authenticate',
  AUTHENTICATED: 'auth.authenticated',
};

// Chat Messages
export const CHAT_MESSAGE = {
  CREATE_CONVERSATION: 'chat.createConversation',
  LEAVE_CONVERSATION: 'chat.leaveConversation',
  JOIN_CONVERSATION: 'chat.joinConversation',
  CONVERSATION_CREATED: 'chat.conversationCreated',
  RENAME_CONVERSATION: 'chat.renameConversation',
  UPDATE_CONVERSATION_ICON: 'chat.updateConversationIcon',
  ADD_CONVERSATION_ADMIN: 'chat.addConversationAdmin',
  CLEAR_CONVERSATION: 'chat.clearConveration',
  SEND_MESSAGE: 'chat.sendMessage',
  LIST_CONVERSATIONS: 'chat.listConversations',
  CONVERSATION_MESSAGES: 'chat.conversationMessages',
  MESSAGE_SEEN: 'chat.messageSeen',
  MESSAGE_FAVORITE: 'chat.messageFavorite',
  MESSAGE_REMOVE_FAVORITE: 'chat.messageRemoveFavorite',
  LIST_FAVORITE_MESSAGES: 'chat.listFavoriteMessages',
  LIST_UNDELIVERED_MESSAGES: 'chat.listUnDeliveredMessages',
  RECEIVE_MESSAGE: 'chat.receiveMessage',
  DELETE_MESSAGE: 'chat.deleteMessage',
  DELETE_MESSAGES_FOR_ME: 'chat.deleteMessagesForMe',
  ACK_EVENT: 'chat.acknowledgementEvent',
  KEYBOARD_ACTION: 'chat.keyboardAction',
  BLOCKED: 'chat.blocked',
  CONVERSATION_UPDATED: 'chat.conversationUpdated',
  UPDATE_CONVERSATION_ROW: 'chat.updateConversationRow',
  CHECK_ONLINE_FRIENDS: 'chat.checkOnlineFriends',
  IAM_ACTIVE: 'chat.iamActive',
};

export const TIMELINE_MESSAGE = {
  FANOUT_STATUS: 'timeline.fanoutStatus',
  FANOUT_TO_LIVE_VIDEO: 'timeline.fanoutToLiveVideo',
  FANIN_STATUS: 'timeline.faninStatus',
  FANOUT_STATUS_ACTIONS: 'timeline.fanoutStatusActions',
  SUBSCRIBE_TO_STATUS: 'timeline.subscribeToStatus',
  UNSUBSCRIBE_TO_STATUS: 'timeline.unsubscribeToStatus',
  CHECK_LIVE_VIDEO_STATUS: 'timeline.checkLiveVideoStatus',
  SUBSCRIBE_TO_LIVE_VIDEO: 'timeline.subscribeToLiveVideo',
};

export const CONTACTS_MESSAGE = {
  UPLOAD_CONTACT: 'contacts.uploadContact',
};

let SERVER_UID: string = '';
/**
 * Get Server Unique identifier
 */
export const getServerUID = (): string => {
  if (SERVER_UID === '') {
    SERVER_UID = generateUnique(6);
    return SERVER_UID;
  } else {
    return SERVER_UID;
  }
};

export const PhotoMulterConfig = MulterConfig('photos', 15, /jpeg|jpg|png|gif/);
export const ClipMulterConfig = MulterConfig('clips', 10, /mpeg|mp3|ogg|wav/);
export const VideoMulterConfig = MulterConfig(
  'videos',
  50,
  /mp4|3gp|mpg|mpeg|mkv|mov|quicktime|x-matroska/,
);
export const FilesMulterConfig = MulterConfig(
  'files',
  30,
  /pdf|docx|ppt|xls|ms-excel|ms-powerpoint|msword|openxmlformats-officedocument/,
);

export const ALLOWED_AGE_RANGE = [
  '0:18',
  '18:22',
  '22:26',
  '26:30',
  '30:34',
  '34:38',
  '38:42',
  '42:46',
  '46:50',
  '50:54',
  '54:58',
  '58:62',
  '62:66',
  '66:70',
];
