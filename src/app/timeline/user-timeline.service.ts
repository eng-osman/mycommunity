import { Status } from '@app/user-status/entities';
import { StatusPrivacy } from '@app/user-status/status-privacy.enum';
import { UserStatusService } from '@app/user-status/user-status.service';
import { UserPrivacy } from '@app/user/privacy/user-privacy.enum';
import { UserPrivacyService } from '@app/user/privacy/user-privacy.service';
import { UserContactsService } from '@app/user/user-contacts.service';
import { UserService } from '@app/user/user.service';
import { ForbiddenException, Injectable } from '@nestjs/common';
import { TimelineCacheService } from './timeline-cache.service';

@Injectable()
export class UserTimelineService {
  constructor(
    private readonly timelineCacheService: TimelineCacheService,
    private readonly userContactsService: UserContactsService,
    private readonly userPrivacyService: UserPrivacyService,
    private readonly userService: UserService,
    private readonly userStatusService: UserStatusService,
  ) {}

  public async getUserTimeline(userId, other, page = 1, limit, reTry = true, filterMedia = false) {
    await this.checkUserPrivacy(userId, other);
    const mediaOnly = filterMedia ? 'mediaOnly' : 'all';
    const timeline = await this.timelineCacheService.getUserTimeline(
      userId,
      other,
      page,
      limit,
      mediaOnly,
    );
    if (timeline.length === 0 && reTry) {
      // Hmmm, let's see.
      // is that a new user ? maybe he just locked-out of cache !
      // let's get his data back,
      await this.userStatusService.buildUserTimeline(userId);
      // Now let's try again
      return this.getUserTimeline(userId, other, page, limit, false, filterMedia);
    }
    const result: any[] = [];
    for (const s of timeline) {
      const isAllowed = await this.filterStatusByPrivacy(s as any, other);
      if (isAllowed) {
        result.push(s);
      }
    }
    if (filterMedia) {
      // return only photos and videos of media.
      return result.filter(s => s.hasMedia && ['photo', 'video'].includes(s.media[0].type));
    }
    return result;
  }

  public async getUserStoryTimeline(userId, other) {
    await this.checkUserPrivacy(userId, other);
    const timeline = await this.timelineCacheService.getUserStoryTimeline(userId);
    if (timeline === null) {
      return [];
    }
    return timeline.filter(async status => this.filterStatusByPrivacy(status, other));
  }

  private async filterStatusByPrivacy(status: Status, user) {
    if (status.user.id === user.id) {
      return true;
    } else if (status.privacy === StatusPrivacy.PUBLIC) {
      return true;
    } else if (status.privacy === StatusPrivacy.CONTACTS_ONLY) {
      const isContact = await this.userContactsService.isContactExist(
        { id: status.user.id },
        user.mobileNumber,
      );
      if (isContact) {
        return true;
      }
    }
    return false;
  }

  private async checkUserPrivacy(userId, other) {
    const me = await this.userService.findUserById(userId);
    const userPrivacy = await this.userPrivacyService.checkPrivacy(me, other.id);
    if (userPrivacy === UserPrivacy.ALL || userPrivacy === UserPrivacy.PROFILE) {
      throw new ForbiddenException('You cannot acsses this user');
    }
  }
}
