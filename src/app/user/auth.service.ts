import { countriesCodes } from '@app/analytics/countries-codes';
import { User } from '@app/user/entities';
import { VerificationService } from '@app/verification/verification.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JWTService, LoggerService } from '@shared/services';
import { parseAndValidatePhoneNumber } from '@shared/utils';
import { isNil } from 'ramda';
import { UserService } from './user.service';
@Injectable()
export class AuthService {
  private readonly logger: LoggerService = new LoggerService(UserService.name);
  constructor(
    private readonly jwtService: JWTService,
    private readonly userService: UserService,
    private readonly verificationService: VerificationService,
  ) {}
  public async loginByMobileNumber(mobileNumber: string, countryDialCode: string) {
    try {
      const c = countriesCodes.find(
        e => e.dialCode.replace(/\+/g, '') === countryDialCode.replace(/\+/g, ''),
      );
      if (isNil(c)) {
        throw new BadRequestException('Bad Country Dail Code !');
      }
      // check it its a system account
      if (!mobileNumber.startsWith('20801802803')) {
        const parsedMobileNumber = parseAndValidatePhoneNumber(mobileNumber, c.code);
        if (isNil(parsedMobileNumber)) {
          throw new BadRequestException('Bad Phone Number');
        }
        const user = await this.userService.findUserByMobileNumber(parsedMobileNumber);
        if (!user) {
          /* NOTE: the mobile number not exist in database.
                  thats mean, the user is trying to register !
                  maybe we delete it ! bannded ?
                  or he is just dumbass user trying out our service !!!
                  whatever, this in TODO:
             */
          throw new UnauthorizedException('User Not found, bad token, OH BOY !');
        }
      }
      return await this.verificationService.sendVerificationCode(mobileNumber, countryDialCode);
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }

  public async verifyLoginByMobileNumber(
    requestId: string,
    code: string,
    mobileNumber: string,
    countryDialCode: string,
  ) {
    try {
      const c = countriesCodes.find(
        e => e.dialCode.replace(/\+/g, '') === countryDialCode.replace(/\+/g, ''),
      );
      if (isNil(c)) {
        throw new BadRequestException('Bad Country Dail Code !');
      }
      let parsedMobileNumber = parseAndValidatePhoneNumber(mobileNumber, c.code);
      if (mobileNumber.includes('801802803')) {
        parsedMobileNumber = mobileNumber;
      }
      if (isNil(parsedMobileNumber)) {
        throw new BadRequestException('Bad Phone Number');
      }
      const result = await this.verificationService.checkCode(
        requestId,
        parsedMobileNumber,
        countryDialCode,
        code,
      );
      const m = mobileNumber.replace(/\+/g, '');
      if (mobileNumber.includes('801802803') && !m.startsWith(countryDialCode.replace(/\+/g, ''))) {
        parsedMobileNumber = countryDialCode.replace(/\+/g, '') + m;
      } else if (mobileNumber.includes('801802803')) {
        parsedMobileNumber = m;
      }
      const user = (await this.userService.findUserByMobileNumber(parsedMobileNumber)) as User;
      if (result.statusCode === 200 && !isNil(user)) {
        const { email, id, username, roles } = user;
        const token = await this.jwtService.signToken<User>({
          email,
          id,
          username,
          parsedMobileNumber,
          roles,
        } as any);
        return { token, id, message: 'User LoggedIn', statusCode: 200 };
      } else {
        return result;
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
  // TODO: Remove this on Production
  public async getTokenByMobileNumber(mobileNumber: string) {
    try {
      const user = (await this.userService.findUserByMobileNumber(mobileNumber)) as User;
      if (!isNil(user)) {
        const { email, id, username, roles } = user;
        const token = await this.jwtService.signToken<User>({
          email,
          id,
          username,
          mobileNumber,
          roles,
        } as any);
        return { token, id, message: 'User LoggedIn', statusCode: 200 };
      } else {
        throw new NotFoundException('User Not Found');
      }
    } catch (error) {
      this.logger.error(error.message, error);
      throw error;
    }
  }
}
