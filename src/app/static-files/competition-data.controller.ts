import { EmployeeGuard } from '@app/analytics/employee.guard';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { CompetitionDataService } from './competition-data.service';
import { SetHtmlDTO } from './dto/set-html.dto';
import { StatusWinnerDTO } from './dto/winner.dto';

@ApiUseTags('StaticFiles')
@Controller('static/competition')
export class CompetitionDataController {
  constructor(private readonly competitionDataService: CompetitionDataService) {}

  @ApiOperation({
    title: 'Get Competition Terms of use',
  })
  @Get('tos')
  public async getTOS() {
    return this.competitionDataService.getTOS();
  }

  @ApiOperation({
    title: 'Get Competition Prizes',
  })
  @Get('prizes')
  public async getPrizes() {
    return this.competitionDataService.getPrizes();
  }

  @ApiOperation({
    title: 'Get Competition Winners (statuses)',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('winners')
  public async getWinners(
    @User() user: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const winners = await this.competitionDataService.getWinners(
      user,
      parseInt(page) || 1,
      parseInt(limit) || 10,
    );
    return winners;
  }

  @ApiOperation({
    title: 'Get Todays Competitions (statuses)',
  })
  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('top')
  public async getTodaysWinners(
    @User() user: any,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('sortBy') sortBy: string,
  ) {

    let sorter = 'likes'; // default;
    if (sortBy && ['date', 'likes', 'comments', 'views'].some(val => val === sortBy)) {
      sorter = sortBy;
    } 

    const top = await this.competitionDataService.getTodaysTopStatuses(
      user,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      sorter,
    );
    return top;
  }

  @ApiOperation({
    title: 'Set Competition Terms of use',
  })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Post('tos')
  public async setTOS(@Body() body: SetHtmlDTO) {
    return this.competitionDataService.setTOS(body.html);
  }

  @ApiOperation({
    title: 'Set Competition Prizes',
  })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Post('prizes')
  public async setPrizes(@Body() body: SetHtmlDTO) {
    return this.competitionDataService.setPrizes(body.html);
  }

  @ApiOperation({
    title: 'Set Todays Competition Winner (status)',
  })
  @ApiBearerAuth()
  @UseGuards(EmployeeGuard)
  @Post('winner')
  public async setTodaysWinners(@Body() body: StatusWinnerDTO) {
    return this.competitionDataService.setTodaysWinner(body.statusId);
  }
}
