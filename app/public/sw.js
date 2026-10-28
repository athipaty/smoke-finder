// Service worker: keeps the app itself (page, scripts, styles, icons) so it
// opens without signal, and shows rule-change alerts. API answers and map
// tiles are never cached here; Nearby keeps its own last results.
// v2: v1 could hold a web page saved in place of a script (see keep()); a new
// name makes every phone drop it on the next update.
const CACHE = 'app-v2'
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg', '/icon-192.png']

// Precache the page plus the scripts and styles it links to.
async function precache() {
  const cache = await caches.open(CACHE)
  const res = await fetch('/', { cache: 'no-cache' })
  const html = await res.clone().text()
  const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1])
  await cache.put('/', res)
  for (const path of [...SHELL.slice(1), ...assets]) {
    const file = await fetch(path, { cache: 'no-cache' })
    if (file.ok && !(file.headers.get('content-type') || '').includes('text/html')) await cache.put(path, file)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().catch(() => {})) // offline support is a bonus; never block install
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Saves a copy, but never a web page in place of a script or style: a missing
// file used to come back as the app page with status 200, and a saved copy of
// that left the app blank for good.
function keep(key, res) {
  if (!res.ok) return
  const type = res.headers.get('content-type') || ''
  const path = new URL(typeof key === 'string' ? key : key.url, self.location.origin).pathname
  if (path !== '/' && type.includes('text/html')) return
  const copy = res.clone() // clone now, before the page reads the body
  caches.open(CACHE).then((c) => c.put(key, copy))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return
  // The public guide pages are plain HTML, not the app: leave them to the browser,
  // and never save one as the app's offline page.
  if (url.pathname.startsWith('/guide/') || url.pathname === '/sitemap.xml' || url.pathname === '/robots.txt') return

  // Pages: network first so updates arrive straight away; the saved page offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          keep('/', res)
          return res
        })
        .catch(() => caches.match('/')),
    )
    return
  }

  // Built files have the content hash in their name, so a saved copy is never stale.
  if (url.pathname.startsWith('/assets/') || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            keep(request, res)
            return res
          }),
      ),
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Smoke Finder SG', {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'rule-change', // a newer alert replaces an unread older one
      data: { url: data.url || '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (w.url.startsWith(self.location.origin) && 'focus' in w) {
          if ('navigate' in w) w.navigate(url)
          return w.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
