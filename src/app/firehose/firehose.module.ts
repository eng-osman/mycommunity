import { ChatModule } from '@app/chat/chat.module';
import { ClusterModule } from '@app/cluster/cluster.module';
import { Module } from '@nestjs/common';
import { FanCacheService } from './fan-cache.service';
import { FanService } from './fan.service';
import { FireHoseGateway } from './firehose.gateway';
import { FireHoseService } from './firehose.service';

@Module({
  imports: [ClusterModule, ChatModule],
  providers: [FireHoseService, FanService, FireHoseGateway, FanCacheService],
})
export class FireHoseModule {}
