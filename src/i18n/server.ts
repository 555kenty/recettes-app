import type { Locale } from './index';

import fr from './messages/fr.json';
import en from './messages/en.json';
import ar from './messages/ar.json';

const allMessages: Record<Locale, Record<string, unknown>> = { fr, en, ar };

export function getMessages(locale: Locale): Record<string, unknown> {
  return allMessages[locale] ?? allMessages.fr;
}

export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
