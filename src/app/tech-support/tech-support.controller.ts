import { EmployeeGuard } from '@app/analytics/employee.guard';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { TechThreadDTO } from './dto/tech-thread.dto';
import { TechSupportService } from './tech-support.service';

@ApiUseTags('TechnicalSupport')
@Controller('techsupport')
@UseGuards(AuthGuard)
export class TechSupportController {
  constructor(private readonly techSupportService: TechSupportService) {}

  @ApiOperation({ title: 'Create New Technical Support Message' })
  @ApiBearerAuth()
  @Post('create/thread')
  public async createThread(@User() user, @Body() data: TechThreadDTO) {
    return this.techSupportService.createSupportMessage(user.id, data.message);
  }

  @ApiOperation({ title: 'Reply to a created Thread' })
  @ApiBearerAuth()
  @Post('reply/thread/:threadId')
  public async replyToThread(
    @User() user,
    @Param('threadId') threadId: string,
    @Body() data: TechThreadDTO,
  ) {
    return this.techSupportService.replyToSupportMessage(threadId, user.id, data.message);
  }

  @ApiOperation({ title: 'Get all thread info and messages' })
  @ApiBearerAuth()
  @Post('thread/:threadId/info')
  public async getThreadInfo(@Param('threadId') threadId: string) {
    return this.techSupportService.getThreadInfo(threadId);
  }

  @ApiOperation({ title: 'Get all My threads' })
  @ApiBearerAuth()
  @Get('all/my/threads')
  public async getMyThreads(
    @User() user,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.techSupportService.getAllThreadsForUser(user.id, page, limit);
  }

  @ApiOperation({ title: 'Get All threads in the system [Employee Only]' })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Get('all/threads')
  public async getAllThreads(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('solvedOnly') solvedOnly: string,
  ) {
    const s = solvedOnly === 'true';
    return this.techSupportService.getAllThreads(page, limit, s);
  }

  @ApiOperation({ title: 'Mark a thread as Solved' })
  @ApiBearerAuth()
  @Post('thread/:threadId/close')
  public async closeThread(@Param('threadId') threadId: string) {
    return this.techSupportService.closeThread(threadId);
  }
}
