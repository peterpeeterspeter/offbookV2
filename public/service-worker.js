// Cache name for app shell and dynamic content
const CACHE_NAME = "offbook-v2-cache-v1";
const DYNAMIC_CACHE = "offbook-v2-dynamic-v1";

// App shell - critical resources that should be cached
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/audio-processor.js",
  "/static/css/main.css",
  "/static/js/main.js",
  "/static/media/logo.svg",
];

// Install event - cache app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter(
            (name) =>
              name.startsWith("offbook-v2-") &&
              name !== CACHE_NAME &&
              name !== DYNAMIC_CACHE
          )
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - network first with cache fallback
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache dynamic content
        if (response.ok && event.request.method === "GET") {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request);
      })
  );
});

// Push event - handle notifications
self.addEventListener("push", (event) => {
  const options = {
    body: event.data.text(),
    icon: "/static/media/logo.svg",
    badge: "/static/media/badge.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: "explore", title: "View Details" },
      { action: "close", title: "Close" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("OFFbook Update", options)
  );
});

// Sync event - handle background sync
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-pending-actions") {
    event.waitUntil(
      // Get pending actions from IndexedDB and sync them
      syncPendingActions()
    );
  }
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});

// Helper function to sync pending actions
async function syncPendingActions() {
  const db = await openDB();
  const pendingActions = await db.getAll("pendingActions");

  for (const action of pendingActions) {
    try {
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      await db.delete("pendingActions", action.id);
    } catch (error) {
      console.error("Sync failed for action:", action.id, error);
    }
  }
}

// Helper function to open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("offbook-sync-db", 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("pendingActions")) {
        db.createObjectStore("pendingActions", { keyPath: "id" });
      }
    };
  });
}
