export type PushSubscriptionKeys = {
  p256dh: string;
  auth: string;
};

export type BrowserPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: PushSubscriptionKeys;
};

export type StoredSubscription = BrowserPushSubscription & {
  userId: string;
  userName: string;
  groupIds: string[];
  createdAt: string;
};

export type SubscribeDto = {
  userId: string;
  userName?: string;
  groupIds: string[];
  subscription: BrowserPushSubscription;
};

export type NotificationPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
};

export type SendDto = {
  target: 'user' | 'group' | 'all';
  userId?: string;
  groupId?: string;
  payload: NotificationPayload;
};
