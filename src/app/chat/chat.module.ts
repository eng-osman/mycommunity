import { ClusterModule } from '@app/cluster/cluster.module';
import { FirebaseModule } from '@app/firebase';
import { UserMedia } from '@app/media/entities';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatAuthGateway } from './chat-auth.getway';
import { ChatAuthService } from './chat-auth.service';
import { ChatCacheService } from './chat-cache.service';
import { ChatMessageService } from './chat-message.service';
import { ChatGateway } from './chat.gateway';
import { ConversationService } from './conversation.service';
import { FavoriteMessageService } from './favorite-message.service';
import { ChatMessageSchema, ConversationSchema } from './schemas';
import { FavoriteMessageSchema } from './schemas/favorite-message.schema';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserMedia]),
    MongooseModule.forFeature([
      { name: 'chat_messages', schema: ChatMessageSchema },
      { name: 'conversations', schema: ConversationSchema },
      { name: 'favorite_messages', schema: FavoriteMessageSchema },
    ]),
    ClusterModule,
    FirebaseModule,
  ],
  providers: [
    ChatCacheService,
    ChatAuthService,
    ChatAuthGateway,
    ChatMessageService,
    ConversationService,
    FavoriteMessageService,
    ChatGateway,
  ],
  exports: [ChatAuthService, ChatCacheService],
})
export class ChatModule {}
