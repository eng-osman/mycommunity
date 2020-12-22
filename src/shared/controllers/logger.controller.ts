import { Controller, Get, InternalServerErrorException, Query } from '@nestjs/common';
import { ApiImplicitQuery, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { isNil } from 'ramda';
import { LoggerService } from '../services';
@ApiUseTags('Debuging')
@Controller('dev/logs')
export class LoggerController {
  private readonly logger: LoggerService = new LoggerService(LoggerController.name);
  @ApiOperation({ title: 'Get Development Logs', description: 'This for development only' })
  @ApiResponse({ status: 200, description: 'an array of logs' })
  @ApiImplicitQuery({
    name: 'limit',
    description: 'the logs limit, default: 30',
    required: false,
    type: Number,
  })
  @ApiImplicitQuery({
    name: 'page',
    description: 'an page to start from, default: 1',
    required: false,
    type: Number,
  })
  @ApiImplicitQuery({
    name: 'messageOnly',
    description: 'only return the log message, default: false',
    required: false,
    type: Boolean,
  })
  @ApiImplicitQuery({
    name: 'level',
    description: 'only return the requested log level, one of [error, info, warn] default: null',
    required: false,
    type: String,
  })
  @Get()
  public async viewLogs(
    @Query('limit') limit: number,
    @Query('page') page: number,
    @Query('messageOnly') messageOnly: boolean = false,
    @Query('level') level,
  ) {
    limit = limit || 30;
    let fields;
    if (messageOnly) {
      fields = ['message'];
    }
    try {
      const res = await this.logger.readLogs(limit, page, fields, level);
      if (!isNil(res)) {
        return res;
      } else {
        return;
      }
    } catch (error) {
      throw new InternalServerErrorException('Error While Reading Log files');
    }
  }
}
