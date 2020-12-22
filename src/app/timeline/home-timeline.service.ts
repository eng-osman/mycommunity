import { Status } from '@app/user-status/entities';
import { StatusPrivacy } from '@app/user-status/status-privacy.enum';
import { Channel } from '@app/user/entities/channel.entity';
import { UserPrivacyService } from '@app/user/privacy/user-privacy.service';
import { UserContactsCacheService } from '@app/user/user-contacts-cache.service';
import { UserContactsService } from '@app/user/user-contacts.service';
import { UserService } from '@app/user/user.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { UserMetadata } from '@shared/interfaces';
import { isEmpty, isNil, map, omit, take } from 'ramda';
import { StoryTimeline } from './interfaces/story-timeline.interface';
import { TimelineCacheService } from './timeline-cache.service';

@Injectable()
export class HomeTimelineService {
  constructor(
    private readonly timelineCacheService: TimelineCacheService,
    private readonly userContactsCacheService: UserContactsCacheService,
    private readonly userContactsService: UserContactsService,
    private readonly userService: UserService,
    private readonly userPrivacyService: UserPrivacyService,
  ) {}

  // 1. Getting User Home Timeline

  /**
   * 1 - Get it from cache
   *    User Sends last status timestamp to query with it.
   *    a. we will get the ids of the statuses, then we just need ask for it from cache
   *    b. send it for the firehose.
   *    c. firehose make a stream for the client, with last statuses he missed
   *
   * 2 - User is new, and there is no cache for his timeline [User Locked out]
   *    Then we need to rebuild it's timeline from the cache
   *    it should take some time.
   *    a. get all of his friends
   *    b. get last 50 statuses ids and scores form all of his friends,
   *    c. feed the hometimeline cache with statuses ids and the scores
   *    d. get the cached timeline, and send it to the firehose
   *    e. firehose should stream it out again and we go for case 1
   *
   */

  public async getUserHomeTimeline(user, timestamp = 0, page = 1, liveVideoOnly = false) {
    page = page <= 0 ? 1 : page;
    const timeline = await this.timelineCacheService.getUserHomeTimeline(user.id, timestamp, page);
    const result = async () => {
      // only try to rebuild the timeline if the page = 1
      if (isEmpty(timeline) && page === 1) {
        // We need to build it again ?
        // or the user is new and not having any friends !
        const timelineFresh = await this.buildTimeline(user, timestamp, page);
        if (!liveVideoOnly) {
          return timelineFresh;
        } else {
          return timelineFresh.filter(s => s.isLive);
        }
      } else {
        if (!liveVideoOnly) {
          return timeline;
        } else {
          return timeline.filter(s => s.isLive);
        }
      }
    };
    const statuses = await result();
    // omit (remove) channel prop from every status on timeline, if it exist
    const statusesWithoutChannelProp = map(omit(['channel']), statuses);
    const filteredStatuses: any[] = [];
    for (const s of statusesWithoutChannelProp) {
      const isAllowed = await this.filterStatusByPrivacy(s as any, user);
      if (isAllowed) {
        filteredStatuses.push(s);
      }
    }
    return filteredStatuses;
  }

  public async getChannelsTimeline(
    user,
    subType: 'followingChannels' | 'friendsChannels' | 'all' = 'all',
    page = 1,
    limit = 10,
    mediaLimitPerChannel = 10,
  ) {
    limit = limit > 50 ? 50 : limit;
    mediaLimitPerChannel = mediaLimitPerChannel > 15 ? 15 : limit;
    let channels: Channel[];
    if (subType === 'followingChannels') {
      channels = await this.userService.getUserFollowingChannels(user.id, page, limit);
    } else if (subType === 'friendsChannels') {
      channels = await this.userService.getUserFriendsChannels(user.id, page, limit);
    } else {
      const followingChannels = await this.userService.getUserFollowingChannels(
        user.id,
        page,
        Math.ceil(limit / 2),
      );
      const friendsChannels = await this.userService.getUserFriendsChannels(
        user.id,
        page,
        Math.ceil(limit / 2),
      );
      const chs = new Map();
      const temp = [...friendsChannels, ...followingChannels];
      for (const ch of temp) {
        chs.set(ch.id, ch);
      }
      channels = [...chs.values()];
    }
    const upper: any[] = [];
    const lower: any[] = [];
    for (const channel of channels) {
      const mediaIds = await this.userService.getChannelMediaIds(
        channel.id,
        1,
        mediaLimitPerChannel,
      );
      const media = await this.timelineCacheService.getAll(mediaIds, user);
      if (isEmpty(media)) {
        continue;
      }
      const notViewed: any[] = media.filter(m => !m.currentUserAction!.isView);
      const viewed: any[] = media.filter(m => m.currentUserAction!.isView);
      const filtered = [...notViewed, ...viewed.reverse()].map(s => {
        delete s.channel;
        return s;
      });
      const entity = { channel, channelMedia: filtered, score: notViewed.length };
      if (notViewed.length === 0) {
        lower.push(entity);
      } else {
        upper.push(entity);
      }
    }
    let result: any[] = [];
    try {
      const myChannelInfo = await this.userService.getUserChannel(user.id);
      const mychannelMedia = await this.getMyChannel(myChannelInfo.id.toString(), 1);
      delete mychannelMedia[0].user;
      result = [...mychannelMedia, ...upper, ...lower];
    } catch {
      result = [...upper, ...lower];
    }
    return result;
  }

  public async getUserHomeStatusTimeline(user, limit = 30) {
    const userFriends = await this.userContactsCacheService.getUserFriends(user.id);
    if (isEmpty(userFriends)) {
      // Ok, then thats a new user, he not having any friends.
      // Or his friends not having any statuses
      return [];
    } else {
      // Then we have some frinds, let's get there last stories and push it
      // to our timeline;
      limit = limit > 50 ? 30 : limit;
      const lastContacts = take(limit, userFriends);
      const stories: Status[] = [];
      for (const { userId } of lastContacts) {
        const friendLastStory = await this.timelineCacheService.getUserStoryTimeline(userId);
        if (friendLastStory !== null) {
          stories.push(...friendLastStory);
        }
      }
      return this.transformUserStoryTimeline(stories);
    }
  }

  public async buildTimeline(user, timestamp = 0, page = 1) {
    const myTimeline = await this.timelineCacheService.getUserTimelineStatusesIds(
      user.id,
      100,
      true,
    );
    const friendsTimeline = await this.getUserFriendsTimeline(user.id);
    const timeline = [...friendsTimeline, ...myTimeline];
    if (isEmpty(timeline)) {
      // Ok, then thats a new user, he not having any friends.
      // Or his friends not having any statuses
      return [];
    } else {
      // Then we have some frinds, let's get there timeline and push it
      // to our timeline;
      return this.timelineCacheService
        .buildUserHomeTimeline(user.id, timeline)
        .then(async () => this.timelineCacheService.getUserHomeTimeline(user.id, timestamp, page));
    }
  }

  public async getUserFriendsTimeline(userId: string, type: 'all' | 'channelMedia' = 'all') {
    const userFriendIds = await this.userContactsCacheService.getUserFriendsIds(userId, 1, 500);
    const friendsTimeline: any[] = [];
    if (isEmpty(userFriendIds)) {
      // Ok, then thats a new user, he not having any friends.
      return [];
    } else {
      for (const friendId of userFriendIds) {
        const friendTimeline = await this.timelineCacheService.getUserTimelineStatusesIds(
          friendId,
          50,
          true,
          type,
        );
        friendsTimeline.push(...friendTimeline);
      }
    }
    return friendsTimeline;
  }

  // TODO: remove this method
  public async getFriendsChannels(user, page = 0) {
    const userFriendsIds = await this.userContactsCacheService.getUserFriendsIds(user.id, 1, 20);
    const ids = new Set(userFriendsIds);
    const followingChannelsMediaIds = await this.userService.getFollowingChannelsTimeline(user.id);
    const followingChannelsMedia = await this.timelineCacheService.getAll(
      followingChannelsMediaIds,
      user,
    );
    const result: Status[] = [];
    const timeline: any[] = [];
    for (const id of ids) {
      // remove current user from friendlist
      if (id === user.id.toString()) {
        continue;
      }
      const friendTimeline = await this.timelineCacheService.getUserTimeline(
        id,
        user,
        page,
        10,
        'mediaOnly',
      );
      const channelMedia = friendTimeline.filter(s => s.type === 'channelMedia');
      const limitedChannelMedia = take(2, channelMedia);
      result.push(...limitedChannelMedia);
    }
    result.push(...followingChannelsMedia);
    const channels: Map<string, Channel> = new Map();
    const channelsMedia: Map<string, Array<any>> = new Map();
    for (const m of result) {
      const channel = m.channel;
      const isBlocked = await this.userPrivacyService.isBlockedChannel(
        user.id,
        channel.id.toString(),
      );
      if (
        (!isNil(m.contactsToshow) &&
          !isEmpty(m.contactsToshow) &&
          !m.contactsToshow.includes(user.id.toString())) ||
        isBlocked
      ) {
        continue;
      }

      if (!channels.has(channel.id)) {
        channels.set(channel.id, channel);
      }
      delete m.media[0].mediaHash;
      delete m.media[0].id;
      delete m.channel;
      if (channelsMedia.has(channel.id)) {
        const media = channelsMedia.get(channel.id)!;
        media.push(m);
      } else {
        channelsMedia.set(channel.id, [m]);
      }
    }
    for (const [k, v] of channels.entries()) {
      const media = channelsMedia.get(k) || [];
      const notViewed: any[] = media.filter(m => !m.currentUserAction!.isView);
      const viewed: any[] = media.filter(m => m.currentUserAction!.isView);
      const entity = {
        channel: v,
        channelMedia: [...notViewed, ...viewed],
      };
      timeline.push(entity);
    }
    return timeline;
  }

  public async getMyChannel(channelId, page = 0) {
    let user;
    if (typeof channelId === 'string') {
      const channel = await this.userService.getChannelById(channelId, true);
      if (channel.owner && !isNil(channel.owner)) {
        user = await this.userService.findUserById(channel.owner.id);
      } else {
        throw new NotFoundException('Channel Not Found !');
      }
    } else {
      user = channelId;
    }
    const result: any[] = [];
    let videoCounter: number = 0;
    let photoCounter: number = 0;
    let likesCount: number = 0;
    let viewsCount: number = 0;
    let dislikesCount: number = 0;
    let sharedCount: number = 0;
    const channelInformation: any = await this.userService.getUserChannel(user.id, false);
    const timelineIds = await this.userService.getChannelMediaIds(channelInformation.id, page, 30);
    const timeline = await this.timelineCacheService.getAll(timelineIds, user);
    const channelMedia = timeline.map(s => {
      likesCount += Number(s.counters.likesCount);
      viewsCount += Number(s.counters.viewsCount);
      sharedCount += Number(s.counters.sharedCount);
      dislikesCount += Number(s.counters.dislikesCount);
      if (s.hasMedia) {
        if (s.media[0].type === 'video') {
          videoCounter++;
        } else if (s.media[0].type === 'photo') {
          photoCounter++;
        }
      }
      delete s.channel; // remove channel key
      delete s.user;
      return s;
    });
    channelInformation.likesCount = likesCount;
    channelInformation.dislikesCount = dislikesCount;
    channelInformation.viewsCount = viewsCount;
    channelInformation.sharedCount = sharedCount;
    channelInformation.photoCounter = photoCounter;
    channelInformation.videoCounter = videoCounter;
    result.push({
      channel: channelInformation,
      channelMedia,
      user,
    });
    return result;
  }

  public async getTopGlobalMediaId() {
    const id = await this.timelineCacheService.getTopGlobalMedia();
    return {
      topGlobalMediaId: id,
    };
  }

  private async transformUserStoryTimeline(data: Status[]): Promise<StoryTimeline[]> {
    const result: Map<number, StoryTimeline> = new Map();
    for (const status of data) {
      const userId = status.user.id;
      const media = {
        id: status.id,
        url: status.media[0].url as string,
        type: status.media[0].type,
        thumbnails: status.media[0].thumbnails,
      };
      if (result.has(userId)) {
        result.get(userId)!.media.push(media);
      } else {
        const statusUser = (status.user as unknown) as UserMetadata;
        const user = {
          id: statusUser.id,
          mobileNumber: statusUser.mobileNumber,
          firstName: statusUser.firstName,
          lastName: statusUser.lastName,
          profileImage: statusUser.profileImage,
        };
        const e: StoryTimeline = {
          user,
          media: [media],
        };
        result.set(userId, e);
      }
    }
    return [...result.values()];
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
}
