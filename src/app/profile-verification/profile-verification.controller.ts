import { EmployeeGuard } from '@app/analytics/employee.guard';
import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { ProfileVerificationDTO } from './dto/profile-verification.dto';
import { ProfileVerificationService } from './profile-verification.service';

@ApiUseTags('User')
@Controller('user/verify/profile')
@UseGuards(AuthGuard)
export class ProfileVerificationController {
  constructor(private readonly profileVerificationService: ProfileVerificationService) {}

  @ApiOperation({ title: 'Get all my profile verification requests' })
  @ApiBearerAuth()
  @Get('myrequests')
  public async myRequests(
    @User() user: { id: string },
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    return this.profileVerificationService.getMyRequests(user.id, page, limit);
  }

  @ApiOperation({ title: 'Get all profile verification requests with some status' })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Get('allrequests')
  public async allRequests(
    // @User() user: { id: string },
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('status') status: string,
  ) {
    return this.profileVerificationService.getAllRequests(page, limit, status);
  }
  @ApiOperation({ title: 'Create a profile verification request' })
  @ApiBearerAuth()
  @Post('create')
  public async create(@User() user: { id: string }, @Body() data: ProfileVerificationDTO) {
    return this.profileVerificationService.createVerificationRequest(user.id, data);
  }

  @ApiOperation({ title: 'Cancel my profile verification request' })
  @ApiBearerAuth()
  @Post('cancel/my/:reqid')
  public async cancelMine(@User() user: { id: string }, @Param('reqid') reqId: string) {
    return this.profileVerificationService.cancelMyVerificationRequest(user.id, reqId);
  }

  @ApiOperation({ title: 'Cancel my profile verification request' })
  @ApiBearerAuth()
  @Post('cancel/:reqid')
  public async cancel(
    // @User() user: { id: string },
    @Param('reqid') reqId: string,
    @Body('message') message: string,
  ) {
    return this.profileVerificationService.cancelVerificationRequest(reqId, message);
  }

  @ApiOperation({ title: 'Accept a profile verification request' })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Post('accept/:reqid')
  public async accept(
    // @User() user: { id: string },
    @Param('reqid') reqId: string,
    @Body('message') message: string,
  ) {
    return this.profileVerificationService.acceptVerificationRequest(reqId, message);
  }
}
