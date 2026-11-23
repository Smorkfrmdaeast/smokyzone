// Service Worker Registration for Smoky Zone Background Music Sync

export const registerServiceWorker = () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Check for updates periodically
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New update available; automatically take over
                  installingWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              }
            };
          }
        };
      })
      .catch((error) => {
        console.warn('Service worker registration note:', error);
      });
  });
};
