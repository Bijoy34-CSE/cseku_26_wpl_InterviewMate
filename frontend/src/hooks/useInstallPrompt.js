import { useState, useEffect } from 'react';

/**
 * Wraps the browser's native PWA install flow.
 *
 * `canInstall` is true only when the browser has actually fired
 * beforeinstallprompt (Chrome/Edge/Android). Safari/iOS never fire it, so
 * callers fall back to showing manual instructions rather than a dead button.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsInstalled(standalone);

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return 'unavailable';
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome; // 'accepted' | 'dismissed'
  };

  return { canInstall: Boolean(deferredPrompt), isInstalled, promptInstall };
}
