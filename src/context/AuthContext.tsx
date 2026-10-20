import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '../lib/api';
import { clearApiKey, clearAllData, loadApiKey, loadMode, loadSettings, saveApiKey, saveMode, saveSettings } from '../lib/storage';
import type { AppSettings, Me, Mode } from '../lib/types';

type AuthContextValue = {
  mode: Mode;
  apiKey: string | null;
  settings: AppSettings;
  isAuthenticated: boolean;
  signInLive: (key: string) => Promise<Me>;
  startDemo: () => void;
  signOut: () => void;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetApp: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => loadMode());
  const [apiKey, setApiKey] = useState<string | null>(() => loadApiKey());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const signInLive = useCallback(async (key: string) => {
    const cleaned = key.trim();
    if (!cleaned) throw new Error('Collez votre clé API Seatiks pour continuer.');
    if (!cleaned.startsWith('stk_')) {
      throw new Error('Une clé API Seatiks commence par « stk_ ». Vérifiez votre copier-coller.');
    }
    const me = await api.me(cleaned);
    saveApiKey(cleaned);
    saveMode('live');
    setApiKey(cleaned);
    setMode('live');
    return me;
  }, []);

  const startDemo = useCallback(() => {
    saveMode('demo');
    setMode('demo');
  }, []);

  const signOut = useCallback(() => {
    clearApiKey();
    saveMode('live');
    setApiKey(null);
    setMode('live');
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetApp = useCallback(() => {
    clearAllData();
    setApiKey(null);
    setMode('live');
    setSettings(loadSettings());
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      mode,
      apiKey,
      settings,
      isAuthenticated: mode === 'demo' || (mode === 'live' && Boolean(apiKey)),
      signInLive,
      startDemo,
      signOut,
      updateSettings,
      resetApp,
    }),
    [mode, apiKey, settings, signInLive, startDemo, signOut, updateSettings, resetApp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
