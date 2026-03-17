'use client';

import { createContext, useContext, useCallback, type ReactNode } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Locale = 'fr' | 'en' | 'ar';

type Messages = Record<string, unknown>;

interface LocaleContextValue {
  locale: Locale;
  messages: Messages;
  t: (key: string) => string;
}

// ─── Context ────────────────────────────────────────────────────────────────

const LocaleContext = createContext<LocaleContextValue | null>(null);

// ─── Helper: deep get by dot-separated key ──────────────────────────────────

function deepGet(obj: Messages, path: string): string {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return path;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : path;
}

// ─── Provider ───────────────────────────────────────────────────────────────

interface LocaleProviderProps {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}

export function LocaleProvider({ locale, messages, children }: LocaleProviderProps) {
  const t = useCallback(
    (key: string): string => deepGet(messages, key),
    [messages],
  );

  return (
    <LocaleContext.Provider value={{ locale, messages, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // Fallback for components outside the provider
    return {
      t: (key: string) => key,
      locale: 'fr' as Locale,
    };
  }
  return { t: ctx.t, locale: ctx.locale };
}
