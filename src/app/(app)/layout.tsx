import { cookies } from 'next/headers';
import { LocaleProvider, type Locale } from '@/i18n';
import { getMessages } from '@/i18n/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value ?? 'fr') as Locale;
  const messages = getMessages(locale);

  return (
    <LocaleProvider locale={locale} messages={messages}>
      {children}
    </LocaleProvider>
  );
}
