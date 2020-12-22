import { LiveVideoService } from '@app/live-video/live-video.service';
import { Body, Controller, ForbiddenException, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { isEmpty, isNil } from 'ramda';

@ApiUseTags('Live Video')
@Controller('stream/live')
export class LiveVideoController {
  constructor(private readonly liveVideoService: LiveVideoService) {}
  @ApiOperation({
    title: 'Reserve a new Channel for you',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('/reserve')
  public async reserveChannel(@User() user, @Query('shouldRecord') shouldRecord: boolean = false) {
    return this.liveVideoService.reserveChannel(user, shouldRecord);
  }

  @Post('/start')
  public async openChannel(@Body() body: any) {
    this.validateToken(body);
    return this.liveVideoService.startStreaming(body.name, body.token);
  }

  @Post('/stop')
  public async closeChannel(@Body() body: any) {
    this.validateToken(body);
    return this.liveVideoService.stopStreaming(body.name, body.token);
  }

  @Post('/listen')
  public async listenToChannel(@Body() body: any) {
    this.validateToken(body);
    return this.liveVideoService.listenToStream(body.name, body.token);
  }

  @Post('/record')
  public async onRecordDone(@Body() body: any) {
    await this.liveVideoService.updateLiveVideoStatus(body);
    return 0;
  }

  @Post('/update')
  public async onUpdate(@Body() body) {
    this.validateToken(body);
    const channel = body.name;
    const callType = body.call;
    if (callType === 'update_publish') {
      this.liveVideoService.pingLiveVideo(channel);
    }
    return 0;
  }

  private validateToken(body): void {
    if (isNil(body.token) || isEmpty(body.token)) {
      throw new ForbiddenException();
    }
  }
}
