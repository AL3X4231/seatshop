import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isInstalledPwa, isIOS, isSafari } from '../lib/notifications';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

type InstallContextValue = {
  open: boolean;
  openInstall: () => void;
  closeInstall: () => void;
  canInstall: boolean;
  installed: boolean;
  isIos: boolean;
  isSafariBrowser: boolean;
  isChromeIos: boolean;
  promptInstall: () => Promise<boolean>;
};

const InstallContext = createContext<InstallContextValue | null>(null);

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(() => isInstalledPwa());
  const isIos = isIOS();
  const isSafariBrowser = isSafari();
  const isChromeIos = /CriOS/.test(navigator.userAgent);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
    };
    const media = window.matchMedia('(display-mode: standalone)');
    const onChange = () => setInstalled(isInstalledPwa());
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    media.addEventListener?.('change', onChange);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
      media.removeEventListener?.('change', onChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) {
      setOpen(true);
      return false;
    }
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setOpen(false);
      setDeferred(null);
      return true;
    }
    return false;
  }, [deferred]);

  const openInstall = useCallback(() => {
    setOpen(true);
  }, []);

  const closeInstall = useCallback(() => setOpen(false), []);

  const value = useMemo<InstallContextValue>(
    () => ({
      open,
      openInstall,
      closeInstall,
      canInstall: Boolean(deferred) && !installed,
      installed,
      isIos,
      isSafariBrowser,
      isChromeIos,
      promptInstall,
    }),
    [open, openInstall, closeInstall, deferred, installed, isIos, isSafariBrowser, isChromeIos, promptInstall],
  );

  return <InstallContext.Provider value={value}>{children}</InstallContext.Provider>;
}

export function useInstall(): InstallContextValue {
  const context = useContext(InstallContext);
  if (!context) throw new Error('useInstall must be used within InstallProvider');
  return context;
}
