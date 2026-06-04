// sw.js - Service Worker for offline support

const CACHE_NAME = 'Informe-Tecnico-v2.1.12'; // 🔥 CHANGE THIS on every deploy// sw.js - Complete offline support with external CDNs

const urlsToCache = [
    './',
    './index.html',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching app shell and external libs');
                // Cache each URL individually to handle failures
                return Promise.allSettled(
                    urlsToCache.map(url => 
                        cache.add(url).catch(err => 
                            console.warn(`[SW] Failed to cache ${url}:`, err)
                        )
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', event => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.filter(key => key !== CACHE_NAME).map(key => {
                console.log('[SW] Deleting old cache:', key);
                return caches.delete(key);
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = event.request.url;
    
    // Handle Google Fonts specially (they have CORS headers)
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
                .catch(() => new Response('', { status: 200 }))
        );
        return;
    }
    
    // For all other requests
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    console.log('[SW] Cache hit:', url);
                    return cachedResponse;
                }
                
                console.log('[SW] Fetching:', url);
                return fetch(event.request)
                    .then(networkResponse => {
                        // Only cache successful responses
                        if (networkResponse && networkResponse.status === 200) {
                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                })
                                .catch(err => console.warn('[SW] Failed to cache:', url, err));
                        }
                        return networkResponse;
                    })
                    .catch(error => {
                        console.warn('[SW] Fetch failed:', url, error);
                        // Return a basic offline fallback for HTML
                        if (event.request.mode === 'navigate') {
                            return caches.match('./index.html');
                        }
                        return new Response('Offline - Content not available', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
