import { EmployeeGuard } from '@app/analytics/employee.guard';
import { UserService } from '@app/user/user.service';
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiUseTags } from '@nestjs/swagger';
import { AnalyticsCacheService } from './analytics-cache.service';

@UseGuards(EmployeeGuard)
@ApiBearerAuth()
@ApiUseTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsCacheService: AnalyticsCacheService,
    private readonly userService: UserService,
  ) {}
  @Get('country/:country')
  public async getCountryUsersWithStatus(
    @Param('country') country: string,
    @Query('filterBy') filterBy: 'online' | 'offline' | 'all' | 'active',
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.analyticsCacheService.getCountryUsersWithStatus(country, filterBy, page, limit);
  }

  @Get('view/user/:id')
  public async getUserById(@Param('id') userId: string) {
    return this.userService.getUserWithTokenById(userId);
  }

  @Get('view/systemAccounts')
  public async getSystemAccounts() {
    return this.userService.getSystemAccountsWithToken();
  }

  @Get('view/user/:id/statics')
  public async getUserStaticsById(@Param('id') userId: string, @Query('year') year?: number) {
    return this.analyticsCacheService.getUserStatics(userId, year);
  }

  @Get('list/accounts')
  public async getCountryOfficialAccounts() {
    return this.analyticsCacheService.getCountriesOfficialAccounts();
  }

  @Get('country/:country/statics')
  public async getCountryStatics(@Param('country') country: string) {
    return this.analyticsCacheService.getCountryStatics(country);
  }

  @Get('global/statics')
  public async getCountriesStatics() {
    return this.analyticsCacheService.getCountriesStatics();
  }

  @Get('home/global/statics')
  public async getHomeGlobalStatics() {
    return this.analyticsCacheService.getHomeGlobalStatics();
  }
}
