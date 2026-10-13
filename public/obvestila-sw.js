// Spletna potisna obvestila (FCM, glej PotisnaObvestila.tsx). Brez knjižnice
// Firebase: obvestilo prikaže sam, dotik odpre `fcmOptions.link` ali `data.url`.
// Obdeluje le push, nikoli fetch — strani ne predpomni.
self.addEventListener('push', (e) => {
  let p = {}
  try {
    p = e.data ? e.data.json() : {}
  } catch {
    return
  }
  const n = p.notification || {}
  const url = (p.fcmOptions && p.fcmOptions.link) || (p.data && p.data.url) || '/'
  e.waitUntil(self.registration.showNotification(n.title || 'SLFF', { body: n.body, icon: '/logo/slff-ikona-180.png', data: { url } }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data && e.notification.data.url || '/', self.location.origin)
  if (url.origin !== self.location.origin) return
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((okna) => {
      const okno = okna.find((o) => new URL(o.url).origin === url.origin)
      // navigate() dela le na oknu, ki ga ta delavec nadzoruje; sicer novo okno.
      if (!okno) return self.clients.openWindow(url.href)
      return okno.navigate(url.href).then((o) => o && o.focus()).catch(() => self.clients.openWindow(url.href))
    }),
  )
})
