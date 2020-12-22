import { ChatAuthService } from '@app/chat/chat-auth.service';
import { Message } from '@app/chat/interfaces/message.interface';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { LoggerService } from '@shared/services';

@Injectable()
export class WsAuthGuard implements CanActivate {
  private readonly logger: LoggerService = new LoggerService('WsAuthGuard');
  constructor(private authService: ChatAuthService) {}
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const data: Message = context.switchToWs().getData();
    if (data && data.clientId) {
      try {
        // If the socket didn't authenticate, return false
        const res = await this.authService.checkUser(data.clientId);
        if (!res) {
          return false;
        } else {
          return true;
        }
      } catch (error) {
        this.logger.error(error.message, error);
        return false;
      }
    } else {
      return false;
    }
  }
}
