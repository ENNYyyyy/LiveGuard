self.addEventListener('push', (event) => {
  let payload = { title: 'Emergency Alert', body: '' };
  try {
    payload = event.data ? event.data.json() : payload;
  } catch {
    payload.body = event.data ? event.data.text() : '';
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Emergency Alert', {
      body: payload.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'emergency-alert',
      renotify: true,
      requireInteraction: true,
      data: payload.data || {},
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/dashboard');
    })
  );
});
