/**
 * App entry — registers the service worker, PWA install prompt, theme switcher,
 * and mounts the main UI into #app.
 */
import { UIRenderer } from './ui';
import { initThemeSwitcher } from './theme-switcher';

/** Chrome/Edge beforeinstallprompt event (not in standard DOM typings). */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/service-worker.js')
    .then(reg => console.log('✓ SW:', reg.scope))
    .catch(err => console.error('✗ SW:', err));
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

/** Shows the PWA install button when the browser fires beforeinstallprompt. */
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;

  const installBtn = document.createElement('button');
  installBtn.textContent = '⬇️ Install App';
  installBtn.className = 'install-btn secondary-button compact-button';
  installBtn.setAttribute('aria-label', 'Install Map Wilderness app');

  /** Prompts the user to install the app and removes the button afterward. */
  installBtn.onclick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtn.remove();
    }
  };

  document.body.appendChild(installBtn);
});

const appContainer = document.getElementById('app');
initThemeSwitcher();
if (appContainer) {
  new UIRenderer(appContainer);
}
