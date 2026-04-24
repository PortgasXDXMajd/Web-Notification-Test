import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import {
  BrowserPushSubscription,
  SendDto,
  StoredSubscription,
  SubscribeDto
} from './push.types.js';

@Injectable()
export class PushService implements OnModuleInit {
  private readonly subscriptions = new Map<string, StoredSubscription>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const subject = this.config.get<string>('VAPID_SUBJECT') ?? 'mailto:you@example.com';
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');

    if (!publicKey || !privateKey || publicKey.startsWith('replace-')) {
      console.warn('VAPID keys are not configured. Run `npm run generate:vapid` and update apps/api/.env.');
      return;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
  }

  subscribe(dto: SubscribeDto) {
    this.assertSubscription(dto.subscription);

    const stored: StoredSubscription = {
      ...dto.subscription,
      userId: dto.userId,
      userName: dto.userName?.trim() || dto.userId,
      groupIds: dto.groupIds,
      createdAt: new Date().toISOString()
    };

    this.subscriptions.set(dto.subscription.endpoint, stored);
    return this.getStats();
  }

  unsubscribe(subscription: BrowserPushSubscription) {
    this.subscriptions.delete(subscription.endpoint);
    return this.getStats();
  }

  list() {
    return Array.from(this.subscriptions.values()).map((subscription) => ({
      endpoint: subscription.endpoint,
      userId: subscription.userId,
      userName: subscription.userName,
      groupIds: subscription.groupIds,
      createdAt: subscription.createdAt
    }));
  }

  getStats() {
    const subscriptions = this.list();
    const users = new Set(subscriptions.map((subscription) => subscription.userId));
    const groups = new Set(subscriptions.flatMap((subscription) => subscription.groupIds));

    return {
      subscriptionCount: subscriptions.length,
      userCount: users.size,
      groupCount: groups.size,
      subscriptions
    };
  }

  async send(dto: SendDto) {
    const targets = this.resolveTargets(dto);
    const results = await Promise.allSettled(
      targets.map((subscription) =>
        webpush.sendNotification(subscription, JSON.stringify(this.buildPayload(dto, subscription)))
      )
    );

    const expiredEndpoints: string[] = [];
    const failures: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        return;
      }

      const subscription = targets[index];
      const reason = result.reason as { statusCode?: number; message?: string };

      if (reason.statusCode === 404 || reason.statusCode === 410) {
        expiredEndpoints.push(subscription.endpoint);
        this.subscriptions.delete(subscription.endpoint);
        return;
      }

      failures.push(reason.message ?? 'Unknown send error');
    });

    return {
      requestedTargetCount: targets.length,
      sentCount: results.filter((result) => result.status === 'fulfilled').length,
      expiredCount: expiredEndpoints.length,
      failureCount: failures.length,
      failures
    };
  }

  private resolveTargets(dto: SendDto) {
    const subscriptions = Array.from(this.subscriptions.values());

    if (dto.target === 'all') {
      return subscriptions;
    }

    if (dto.target === 'user') {
      if (!dto.userId) {
        throw new BadRequestException('userId is required for user target');
      }

      return subscriptions.filter((subscription) => subscription.userId === dto.userId);
    }

    const groupId = dto.groupId;
    if (!groupId) {
      throw new BadRequestException('groupId is required for group target');
    }

    return subscriptions.filter((subscription) => subscription.groupIds.includes(groupId));
  }

  private buildPayload(dto: SendDto, subscription: StoredSubscription) {
    const targetContext =
      dto.target === 'group'
        ? `group ${dto.groupId}`
        : dto.target === 'all'
          ? 'all subscribers'
          : `user ${subscription.userId}`;

    return {
      ...dto.payload,
      title: `${dto.payload.title} - ${subscription.userName}`,
      body: `Recipient: ${subscription.userName} (${subscription.userId}). ${dto.payload.body}`,
      tag: dto.payload.tag
        ? `${dto.payload.tag}-${subscription.userId}`
        : `${dto.target}-${subscription.userId}-${Date.now()}`,
      recipient: {
        userId: subscription.userId,
        userName: subscription.userName,
        groupIds: subscription.groupIds,
        targetContext
      }
    };
  }

  private assertSubscription(subscription: BrowserPushSubscription) {
    if (!subscription?.endpoint || !subscription.keys?.auth || !subscription.keys?.p256dh) {
      throw new BadRequestException('Invalid browser push subscription');
    }
  }
}
