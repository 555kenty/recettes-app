'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useT, type Locale } from '@/i18n';
import { setLocale } from '@/i18n/actions';

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'fr', label: 'FR' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'AR' },
];

interface LanguageSwitcherProps {
  compact?: boolean;
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { locale } = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSwitch = (newLocale: Locale) => {
    if (newLocale === locale) return;
    startTransition(async () => {
      await setLocale(newLocale);
      // Set dir attribute on html for RTL support
      document.documentElement.setAttribute('data-dir', newLocale === 'ar' ? 'rtl' : 'ltr');
      document.documentElement.setAttribute('data-locale', newLocale);
      router.refresh();
    });
  };

  return (
    <div className={`flex items-center gap-0.5 ${compact ? '' : 'px-4 py-2'}`}>
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleSwitch(code)}
          disabled={isPending}
          className={`
            ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1.5 text-xs'}
            rounded-lg font-medium transition-all duration-150
            disabled:opacity-50
            ${locale === code
              ? 'bg-stone-900 text-white'
              : 'text-stone-500 hover:text-stone-900 hover:bg-canvas-100'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
