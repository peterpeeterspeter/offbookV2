import { loggingService } from '../monitoring/logging-service';

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: {
    register(tag: string): Promise<void>;
  };
}

interface ServiceWorkerRegistrationWithPeriodicSync extends ServiceWorkerRegistration {
  periodicSync: {
    getTags(): Promise<string[]>;
    register(tag: string, options: { minInterval: number }): Promise<void>;
  };
}

export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available
              notifyUserOfUpdate();
            }
          });
        }
      });

      // Request notification permission
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        loggingService.info('Notification permission status:', { permission });
      }

      // Register sync
      if ('sync' in registration) {
        try {
          await (registration as ServiceWorkerRegistrationWithSync).sync.register('sync-pending-actions');
          loggingService.info('Background sync registered successfully');
        } catch (error) {
          loggingService.error('Background sync registration failed', error instanceof Error ? error : new Error(String(error)));
        }
      }

      loggingService.info('Service Worker registered successfully', {
        scope: registration.scope
      });
    } catch (error) {
      loggingService.error('Service Worker registration failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  } else {
    loggingService.warn('Service Workers are not supported');
  }
}

function notifyUserOfUpdate(): void {
  const event = new CustomEvent('swUpdate', {
    detail: {
      message: 'New content is available, please refresh.',
      timestamp: new Date().toISOString()
    }
  });
  window.dispatchEvent(event);
}

// Helper function to check if app is installed
export function isPWAInstalled(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
}

// Helper function to check PWA support
export function checkPWASupport(): Record<string, boolean> {
  return {
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notifications: 'Notification' in window,
    backgroundSync: 'SyncManager' in window,
    installPrompt: 'BeforeInstallPromptEvent' in window,
    periodicSync: 'PeriodicSyncManager' in window
  };
}

// Helper function to register periodic background sync
export async function registerPeriodicSync(): Promise<void> {
  if (!('periodicSync' in navigator.serviceWorker)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const periodicSync = (registration as ServiceWorkerRegistrationWithPeriodicSync).periodicSync;
    const tags = await periodicSync.getTags();

    // Only register if not already registered
    if (!tags.includes('content-sync')) {
      await periodicSync.register('content-sync', {
        minInterval: 24 * 60 * 60 * 1000 // 24 hours
      });
      loggingService.info('Periodic background sync registered');
    }
  } catch (error) {
    loggingService.error('Periodic background sync registration failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
