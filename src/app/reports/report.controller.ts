import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { CreateReportDTO } from './dto/create-report.dto';
import { ReportService } from './report.service';

@ApiUseTags('Reports')
@UseGuards(AuthGuard)
@Controller('/report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @ApiOperation({
    title: 'report a user or a status',
  })
  @ApiBearerAuth()
  @Post('/create')
  public async report(@User() user, @Body() data: CreateReportDTO) {
    return this.reportService.createReport(user.id, data);
  }

  @ApiOperation({
    title: 'list all reports',
  })
  @ApiBearerAuth()
  @Get('/listall')
  public async listAll(@Query('page') page: string, @Query('limit') limit: string) {
    return this.reportService.listAll(page, limit);
  }

  @ApiOperation({
    title: 'list all reports for user',
  })
  @ApiBearerAuth()
  @Get('/list/:userId')
  public async listAllReporsForUser(
    @Param('userId') userId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.reportService.listAllForUser(userId, page, limit);
  }

  @ApiOperation({
    title: 'delete a report by id',
  })
  @ApiBearerAuth()
  @Delete('/:reportId')
  public async removeReport(@Param('reportId') reportId: string) {
    return this.reportService.deleteReportById(reportId);
  }

  @ApiOperation({
    title: 'get a report by id',
  })
  @ApiBearerAuth()
  @Get('/:reportId')
  public async getReport(@Param('reportId') reportId: string) {
    return this.reportService.getReportById(reportId);
  }
}
