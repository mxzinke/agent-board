import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('ab-install-dismissed') === '1');

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('ab-install-dismissed', '1');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-3 flex items-center justify-between z-50 sm:hidden">
      <div className="flex items-center gap-2 text-sm">
        <Download className="w-4 h-4" />
        <span>Install agent-board</span>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={handleInstall} className="px-3 py-1 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-medium">Install</button>
        <button onClick={handleDismiss}><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
