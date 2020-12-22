import { getServerUID } from '@app/constants';
import { Injectable } from '@nestjs/common';
import { JWTService } from '@shared/services';
import { getIdFromNamespace } from '@shared/utils';
import { isNil } from 'ramda';
import { ChatCacheService } from './chat-cache.service';
import { UserInformation } from './interfaces/user-info.interface';
@Injectable()
export class ChatAuthService {
  constructor(
    private readonly jwtService: JWTService,
    private readonly chatCacheService: ChatCacheService,
  ) {}

  public async authUser(
    token: string,
    id: string,
  ): Promise<{ isOK: boolean; userId: string; username: string }> {
    const clientID = getIdFromNamespace(id);
    try {
      const userInfo: UserInformation = await this.jwtService.verifyToken<UserInformation>(token);
      userInfo.clientId = clientID;
      userInfo.iamActive = true;
      userInfo.serverId = getServerUID();
      await this.chatCacheService.cacheUserInformation(userInfo, clientID, '4h');
      return { isOK: true, userId: userInfo.id, username: userInfo.username };
    } catch (error) {
      throw error;
    }
  }

  public async checkUser(id: string): Promise<boolean> {
    const clientID = getIdFromNamespace(id);
    try {
      const user = await this.chatCacheService.checkIfUserExist(clientID);
      if (isNil(user)) {
        return false;
      } else {
        return Boolean(user);
      }
    } catch (error) {
      throw error;
    }
  }

  public async removeUser(id: string) {
    const clientID = getIdFromNamespace(id);
    try {
      await this.chatCacheService.kickUser(clientID);
    } catch (error) {
      throw error;
    }
  }
}
