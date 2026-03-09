import { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true;
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('ab-install-dismissed') === '1');

  useEffect(() => {
    if (dismissed || isStandalone()) return;

    if (isIOS()) {
      // Show iOS instructions after a short delay
      const timer = setTimeout(() => setShowIOSPrompt(true), 2000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  if (dismissed || isStandalone()) return null;
  if (!deferredPrompt && !showIOSPrompt) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('ab-install-dismissed', '1');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-3 z-50 sm:hidden safe-bottom">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {showIOSPrompt ? (
            <>
              <Share className="w-5 h-5 flex-shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Install app: </span>
                <span className="opacity-80">Tap </span>
                <Share className="w-3.5 h-3.5 inline -mt-0.5" />
                <span className="opacity-80"> then "Add to Home Screen"</span>
              </div>
            </>
          ) : (
            <>
              <Download className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">Install agent-board as app</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {!showIOSPrompt && (
            <button onClick={handleInstall} className="px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium rounded">
              Install
            </button>
          )}
          <button onClick={handleDismiss} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
