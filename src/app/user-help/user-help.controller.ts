import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiUseTags } from '@nestjs/swagger';
import { User } from '@shared/decorators';
import { AuthGuard } from '@shared/guards';
import { Request } from 'express';
import { CreateHelpDTO } from './dto/create-help.dto';
import { ListHelpDTO } from './dto/list-help.dto';
import { UpdateHelpDTO } from './dto/update-help.dto';
import { UserHelpService } from './user-help.service';

@UseGuards(AuthGuard)
@ApiUseTags('User Help')
@Controller('user/help')
export class UserHelpController {
  constructor(private readonly userHelpService: UserHelpService) {}

  @ApiOperation({
    title: 'get my current month help (if any)',
  })
  @ApiResponse({
    status: 200,
    description: 'The Current Month Help',
  })
  @ApiBearerAuth()
  @Get('me')
  public async myHelp(@User() user: any) {
    return this.userHelpService.myCurrentMonthHelp(user);
  }

  @ApiOperation({
    title: 'get all the categories depends on your language',
  })
  @ApiBearerAuth()
  @Get('categories')
  public async categories(@Req() req: Request) {
    const lang = req.headers['accept-language'] as string;
    let language = 'ar';
    if (lang) {
      language = lang.toLowerCase() === 'en' ? 'en' : 'ar';
    }
    return this.userHelpService.listCategories(language);
  }
  @ApiOperation({
    title: 'create new ask for help',
  })
  @ApiBearerAuth()
  @Post('me')
  public async askForHelp(@User() user: any, @Body() data: CreateHelpDTO) {
    return this.userHelpService.create(user, data);
  }

  @ApiOperation({
    title: 'update my current ask for help that created this month',
  })
  @ApiBearerAuth()
  @Post('me/update')
  public async updateMyHelp(@User() user: any, @Body() data: UpdateHelpDTO) {
    return this.userHelpService.update(user, data);
  }

  @ApiOperation({
    title: 'delete my current help that created this month',
  })
  @ApiBearerAuth()
  @Delete('me')
  public async deleteMyHelp(@User() user: any) {
    return this.userHelpService.delete(user);
  }

  @ApiOperation({
    title: 'get all the users that needs help near my location',
  })
  @ApiBearerAuth()
  @Get('near/me')
  public async nearMe(@User() user: any, @Query() query: ListHelpDTO, @Req() req: Request) {
    const lang = req.headers['accept-language'] as string;
    let language = 'ar';
    if (lang) {
      language = lang.toLowerCase() === 'en' ? 'en' : 'ar';
    }
    return this.userHelpService.helpNearLocation(user, query, language);
  }

  @ApiOperation({
    title: 'acquire that help',
  })
  @ApiBearerAuth()
  @Post('acquire/:id')
  public async acquire(@User() user: any, @Param('id') id: string) {
    return this.userHelpService.acquire(user, id);
  }

  @ApiOperation({
    title: 'confirm that help it is done',
  })
  @ApiBearerAuth()
  @Post('confirm/:id')
  public async confirm(@User() user: any, @Param('id') id: string) {
    return this.userHelpService.confirm(user, id);
  }
}
