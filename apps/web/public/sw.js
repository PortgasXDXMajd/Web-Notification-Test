self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  event.waitUntil(
    self.registration.showNotification(data.title || 'New notification', {
      body: data.body || '',
      icon: data.icon || '/icon.svg',
      badge: data.badge || '/icon.svg',
      tag: data.tag,
      data: {
        url: data.url || '/'
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destinationUrl = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(destinationUrl);
          return client.focus();
        }
      }

      return clients.openWindow(destinationUrl);
    })
  );
});
