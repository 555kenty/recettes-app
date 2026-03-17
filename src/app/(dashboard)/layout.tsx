import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { DashboardShell } from './DashboardShell';
import { LocaleProvider, type Locale } from '@/i18n';
import { getMessages } from '@/i18n/server';

const GOALS: Record<string, string> = {
  lose: 'Manger sain',
  sport: 'Objectif sport',
  cook: 'Cuisiner & partager',
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect('/login');
  }

  const userName = session.user.name ?? 'Chef';

  // Read locale from cookie
  const cookieStore = await cookies();
  const locale = (cookieStore.get('locale')?.value ?? 'fr') as Locale;
  const messages = getMessages(locale);

  // Fetch profile goal server-side
  let goalLabel = '';
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/users/${session.user.id}`, {
      headers: Object.fromEntries((await headers()).entries()),
      cache: 'no-store',
    });
    if (res.ok) {
      const { user } = await res.json();
      if (user?.profile?.goal) {
        goalLabel = GOALS[user.profile.goal] ?? '';
      }
    }
  } catch {
    // Silently handle - goal label is optional
  }

  return (
    <LocaleProvider locale={locale} messages={messages}>
      <DashboardShell
        userName={userName}
        goalLabel={goalLabel}
        userEmail={session.user.email}
      >
        {children}
      </DashboardShell>
    </LocaleProvider>
  );
}
