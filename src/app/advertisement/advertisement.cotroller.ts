import { ChangeAdvertisementStatusDTO } from '@app/advertisement/dto/change-ad-status.dto';
import { CreateAdvertisementDTO } from '@app/advertisement/dto/create-ad.dto';
import { EmployeeGuard } from '@app/analytics/employee.guard';
import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiImplicitQuery, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { AdvertisementService } from './advertisement.service';
import { CreateAdvertisementCategoryDTO } from './dto/create-ad-category.dto';
import { PerformAdvertisementActionDTO } from './dto/perform-ad-action.dto';
import { UpdateAdvertisementDTO } from './dto/update-ad.dto';

@ApiUseTags('Advertisement')
@UseGuards(AuthGuard)
@Controller('ads')
export class AdvertisementController {
  constructor(private readonly adService: AdvertisementService) {}

  @ApiOperation({
    title: 'Create New Advertisement',
  })
  @ApiBearerAuth()
  @Post('create')
  public async createAd(@User() user, @Body() data: CreateAdvertisementDTO) {
    return this.adService.createAdvertisment(user.id, data);
  }

  @ApiOperation({
    title: 'Update Advertisement',
  })
  @ApiBearerAuth()
  @Post(':id/update')
  public async updateAd(
    @User() user,
    @Param('id') adId: string,
    @Body() data: UpdateAdvertisementDTO,
  ) {
    return this.adService.updateAdvertisment(user.id, adId, data);
  }

  @ApiOperation({
    title: 'Get Advertisement Statics',
  })
  @ApiBearerAuth()
  @Get(':id/statics')
  public async getAdStatics(@Param('id') adId: string) {
    return this.adService.getAdvertismentStatics(adId);
  }

  @ApiOperation({
    title: 'Get some Advertisements for current logged in user',
  })
  @ApiImplicitQuery({
    name: 'count',
    description: 'how many ads do you want ? [max: 30]',
    type: Number,
  })
  @ApiBearerAuth()
  @Get('pick')
  public async pickAdsForTarget(
    @User() user,
    @Query('count') count: string,
    @Query('page') page: string,
  ) {
    let reqCount = parseInt(count);
    let p = parseInt(page);
    if (reqCount > 30) {
      reqCount = 30;
    }
    if (p <= 0) {
      p = 1;
    }
    return this.adService.getTargetRandomAdvertisements(user.id, reqCount, p);
  }

  @ApiOperation({
    title: 'perform an [Click, View] against an Advertisement',
  })
  @ApiBearerAuth()
  @Post(':id/action')
  public async performAdAction(
    @User() user,
    @Param('id') adId: string,
    @Body() data: PerformAdvertisementActionDTO,
  ) {
    return this.adService.updateAdvertismentStatics(user.id, adId, data.actionType);
  }

  @ApiOperation({
    title: 'Create New Advertisement Category',
  })
  @ApiBearerAuth()
  @Post('category/create')
  public async createAdCategory(@Body() data: CreateAdvertisementCategoryDTO) {
    return this.adService.createAdvertismentCategory(data);
  }

  @ApiOperation({
    title: 'Change The Stauts of an Advertisement [Employee Only]',
  })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Post(':id/status')
  public async changeAdStatus(@Param('id') id: string, @Body() data: ChangeAdvertisementStatusDTO) {
    return this.adService.changeAdStatusById(id, data.status);
  }

  @ApiOperation({
    title: 'get a list of Advertisements -optinaly for a spesific user-',
  })
  @ApiImplicitQuery({
    name: 'page',
    type: Number,
  })
  @ApiImplicitQuery({
    name: 'limit',
    type: Number,
  })
  @ApiImplicitQuery({
    name: 'forUserId',
    type: Number,
    required: false,
  })
  @ApiImplicitQuery({
    name: 'activeOnly',
    description: 'get only the active ads',
    type: Boolean,
  })
  @ApiBearerAuth()
  @Get('list')
  public async getAdvertisments(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('forUserId') forUserId: string,
    @Query('activeOnly') activeOnly: string,
  ) {
    const reqPage = parseInt(page);
    const reqLimit = parseInt(limit);
    const reqActiveOnly = activeOnly === 'true';
    return this.adService.getAdvertisments(reqPage, reqLimit, forUserId, reqActiveOnly);
  }

  @ApiOperation({
    title: 'Remove Advertisement Category by id',
  })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Delete('category/:id/remove')
  public async removeAdCategory(@Param('id') categoryId: string) {
    return this.adService.removeAdvertismentCategory(categoryId);
  }
}
