'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Target = 'user' | 'group' | 'all';

type Stats = {
  subscriptionCount: number;
  userCount: number;
  groupCount: number;
  subscriptions: Array<{
    endpoint: string;
    userId: string;
    userName: string;
    groupIds: string[];
    createdAt: string;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

const users = [
  { id: 'alice', name: 'Alice' },
  { id: 'bob', name: 'Bob' },
  { id: 'carla', name: 'Carla' }
];

const groups = [
  { id: 'ops', name: 'Operations' },
  { id: 'sales', name: 'Sales' },
  { id: 'support', name: 'Support' }
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers
    }
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json() as Promise<T>;
}

export default function Home() {
  const [selectedUser, setSelectedUser] = useState(users[0].id);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([groups[0].id]);
  const [target, setTarget] = useState<Target>('user');
  const [title, setTitle] = useState('Targeted update');
  const [description, setDescription] = useState('This notification was sent from NestJS.');
  const [logoUrl, setLogoUrl] = useState('/icon.svg');
  const [clickUrl, setClickUrl] = useState('/notification-demo');
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [stats, setStats] = useState<Stats | null>(null);
  const [status, setStatus] = useState('Ready.');

  const targetLabel = useMemo(() => {
    if (target === 'all') {
      return 'all subscribed devices';
    }
    if (target === 'group') {
      return `group: ${selectedGroups[0]}`;
    }
    return `user: ${selectedUser}`;
  }, [selectedGroups, selectedUser, target]);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission);
    void refreshStats();
  }, []);

  async function refreshStats() {
    try {
      setStats(await requestJson<Stats>('/push/subscriptions'));
    } catch {
      setStats(null);
    }
  }

  async function enableNotifications() {
    try {
      if (permission === 'unsupported') {
        setStatus('This browser does not support Web Push.');
        return;
      }

      if (!vapidPublicKey || vapidPublicKey.startsWith('replace-')) {
        setStatus('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY. Generate VAPID keys and update apps/web/.env.local.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await registration.update();
      const granted = await Notification.requestPermission();
      setPermission(granted);

      if (granted !== 'granted') {
        setStatus('Notification permission was not granted.');
        return;
      }

      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription =
        existingSubscription ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        }));

      const nextStats = await requestJson<Stats>('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          userId: selectedUser,
          userName: users.find((user) => user.id === selectedUser)?.name ?? selectedUser,
          groupIds: selectedGroups,
          subscription
        })
      });

      setStats(nextStats);
      setStatus(`Subscribed this browser as ${users.find((user) => user.id === selectedUser)?.name ?? selectedUser}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to subscribe.');
    }
  }

  async function sendNotification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const response = await requestJson<{
        requestedTargetCount: number;
        sentCount: number;
        expiredCount: number;
        failureCount: number;
        failures: string[];
      }>('/push/send', {
        method: 'POST',
        body: JSON.stringify({
          target,
          userId: target === 'user' ? selectedUser : undefined,
          groupId: target === 'group' ? selectedGroups[0] : undefined,
          payload: {
            title,
            body: description,
            icon: logoUrl,
            badge: logoUrl,
            url: clickUrl,
            tag: `${target}-${Date.now()}`
          }
        })
      });

      setStatus(
        `Sent ${response.sentCount}/${response.requestedTargetCount} notification(s) to ${targetLabel}.`
      );
      await refreshStats();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to send notification.');
    }
  }

  function toggleGroup(groupId: string) {
    setSelectedGroups((current) => {
      const next = current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId];

      return next.length > 0 ? next : [groupId];
    });
  }

  return (
    <main className="shell">
      <section className="intro">
        <p className="eyebrow">Next.js + NestJS</p>
        <h1>Targeted Web Push PoC</h1>
        <p>
          Subscribe this browser as a user, assign it to one or more groups, then send push
          notifications to one user, one group, or everyone.
        </p>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>1. Subscribe device</h2>
          <label>
            User
            <select value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)}>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend>Groups</legend>
            <div className="checks">
              {groups.map((group) => (
                <label key={group.id} className="check">
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(group.id)}
                    onChange={() => toggleGroup(group.id)}
                  />
                  {group.name}
                </label>
              ))}
            </div>
          </fieldset>

          <button type="button" onClick={enableNotifications}>
            Enable notifications
          </button>
          <p className="hint">Permission: {permission}</p>
        </div>

        <form className="panel" onSubmit={sendNotification}>
          <h2>2. Send notification</h2>
          <label>
            Target
            <select value={target} onChange={(event) => setTarget(event.target.value as Target)}>
              <option value="user">Selected user</option>
              <option value="group">First selected group</option>
              <option value="all">All subscribers</option>
            </select>
          </label>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label>
            Description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <label>
            Logo URL
            <input
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
              placeholder="/icon.svg"
            />
          </label>
          <label>
            Click URL
            <input
              value={clickUrl}
              onChange={(event) => setClickUrl(event.target.value)}
              placeholder="/notification-demo"
            />
          </label>
          <div className="preview">
            <span
              className="previewLogo"
              style={{ backgroundImage: `url("${logoUrl || '/icon.svg'}")` }}
              aria-hidden="true"
            />
            <div>
              <strong>{title || 'Notification title'}</strong>
              <span>{description || 'Notification description'}</span>
              <code>{clickUrl || '/'}</code>
            </div>
          </div>
          <button type="submit">Send to {targetLabel}</button>
        </form>
      </section>

      <section className="panel wide">
        <div className="status">
          <strong>Status</strong>
          <span>{status}</span>
        </div>

        <div className="stats">
          <span>{stats?.subscriptionCount ?? 0} subscriptions</span>
          <span>{stats?.userCount ?? 0} users</span>
          <span>{stats?.groupCount ?? 0} groups</span>
        </div>

        <div className="table">
          {stats?.subscriptions.length ? (
            stats.subscriptions.map((subscription) => (
              <div key={subscription.endpoint} className="row">
                <span>{subscription.userName}</span>
                <span>{subscription.groupIds.join(', ')}</span>
                <code>{subscription.endpoint.slice(0, 72)}...</code>
              </div>
            ))
          ) : (
            <p className="hint">No subscriptions yet.</p>
          )}
        </div>
      </section>
    </main>
  );
}
