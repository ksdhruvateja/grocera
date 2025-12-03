// Service Worker Registration and Management

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/sw.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('Service Worker ready for offline use.');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl)
    .then(registration => {
      // Check for service worker updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }

        installingWorker.addEventListener('statechange', () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              console.log('New content available; please refresh.');
              
              // Show update notification to user
              showUpdateNotification();

              if (config && config.onUpdate) {
                config.onUpdate(registration);
              }
            } else {
              console.log('Content cached for offline use.');

              if (config && config.onSuccess) {
                config.onSuccess(registration);
              }
            }
          }
        });
      });

      // Register for background sync if supported
      if ('sync' in window.ServiceWorkerRegistration.prototype) {
        console.log('Background sync supported');
      }

      // Register for periodic background sync if supported
      if ('periodicSync' in window.ServiceWorkerRegistration.prototype) {
        registration.periodicSync.register('product-updates', {
          minInterval: 24 * 60 * 60 * 1000, // 24 hours
        }).then(() => {
          console.log('Periodic background sync registered');
        }).catch(error => {
          console.error('Periodic background sync registration failed:', error);
        });
      }

      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          console.log('Notification permission:', permission);
        });
      }
    })
    .catch(error => {
      console.error('Service Worker registration failed:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then(response => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then(registration => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection. App running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error('Service Worker unregistration failed:', error);
      });
  }
}

// Background sync helpers
export function scheduleBackgroundSync(tag, data) {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    navigator.serviceWorker.ready.then(registration => {
      // Store data for background sync
      storeOfflineAction(tag, data);
      
      return registration.sync.register(tag);
    }).then(() => {
      console.log('Background sync scheduled:', tag);
    }).catch(error => {
      console.error('Background sync registration failed:', error);
    });
  }
}

// Store offline actions in IndexedDB
function storeOfflineAction(tag, data) {
  const request = indexedDB.open('RBSOfflineActions', 1);
  
  request.onupgradeneeded = event => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('actions')) {
      db.createObjectStore('actions', { keyPath: 'id', autoIncrement: true });
    }
  };
  
  request.onsuccess = event => {
    const db = event.target.result;
    const transaction = db.transaction(['actions'], 'readwrite');
    const store = transaction.objectStore('actions');
    
    store.add({
      tag,
      data,
      timestamp: Date.now()
    });
  };
}

// Show update notification to user
function showUpdateNotification() {
  // Create a custom notification UI
  const notification = document.createElement('div');
  notification.className = 'app-update-notification';
  notification.innerHTML = `
    <div class="update-content">
      <span>🎉 New version available!</span>
      <button onclick="this.parentElement.parentElement.remove(); window.location.reload();">
        Update Now
      </button>
      <button onclick="this.parentElement.parentElement.remove();">
        Later
      </button>
    </div>
  `;
  
  // Add styles
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    background: linear-gradient(45deg, #ff6b00, #ff8533);
    color: white;
    padding: 15px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease-out;
  `;
  
  const style = document.createElement('style');
  style.textContent = `
    .app-update-notification .update-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .app-update-notification button {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      padding: 8px 12px;
      border-radius: 5px;
      cursor: pointer;
      font-weight: 600;
      transition: background 0.3s;
    }
    .app-update-notification button:hover {
      background: rgba(255,255,255,0.3);
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(notification);
  
  // Auto-remove after 10 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 10000);
}

// Performance monitoring for service worker
export function monitorServiceWorkerPerformance() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data.type === 'CACHE_HIT') {
        console.log('Cache hit for:', event.data.url);
      } else if (event.data.type === 'CACHE_MISS') {
        console.log('Cache miss for:', event.data.url);
      }
    });
  }
}