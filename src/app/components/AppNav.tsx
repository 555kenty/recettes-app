'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChefHat, Lightbulb, Compass, ShoppingCart, User, LogOut, Users, Scale, Activity,
} from 'lucide-react';
import { signOut } from '@/lib/auth-client';

// ─── Types ─────────────────────────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppNavProps {
  userName: string;
  goalLabel: string;
  userEmail?: string;
}

// ─── Navigation items ──────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
  { href: '/fridge',      label: 'Mon Frigo',    shortLabel: 'Frigo',   icon: ChefHat },
  { href: '/suggestions', label: 'Suggestions',  shortLabel: 'Sugg.',   icon: Lightbulb },
  { href: '/discover',    label: 'Découvrir',    shortLabel: 'Explorer',icon: Compass },
  { href: '/feed',        label: 'Feed',         shortLabel: 'Feed',    icon: Users },
  { href: '/nutrition',   label: 'Nutrition',    shortLabel: 'Nutri.',  icon: Activity },
  { href: '/compare',     label: 'Comparer',     shortLabel: 'Comp.',   icon: Scale },
  { href: '/shopping',    label: 'Courses',      shortLabel: 'Courses', icon: ShoppingCart },
  { href: '/profile',     label: 'Profil',       shortLabel: 'Profil',  icon: User },
];

// ─── Sidebar (desktop) ────────────────────────────────────────────────────

export function AppSidebar({ userName, goalLabel }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string): boolean => {
    if (href === '/feed' || href === '/discover' || href === '/compare') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-canvas-200 h-screen sticky top-0 flex-shrink-0">
      <div className="p-5 flex-1">
        {/* Logo */}
        <Link href="/fridge" className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-stone-900">Cuisine<span className="text-brand-500 font-bold">Connect</span></span>
        </Link>

        {/* Nav */}
        <nav className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full ${active ? 'nav-item-active' : 'nav-item'}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User card */}
      <div className="p-4 border-t border-canvas-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-white text-sm">{userName.charAt(0).toUpperCase()}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-stone-900 text-sm truncate">{userName}</p>
            <p className="text-[11px] text-stone-400 truncate">{goalLabel}</p>
          </div>
          <button
            onClick={() => signOut().then(() => router.replace('/login'))}
            className="text-stone-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
            title="Se déconnecter"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Mobile header ─────────────────────────────────────────────────────────

export function AppMobileHeader({ userName }: { userName: string }) {
  return (
    <header className="lg:hidden bg-white px-4 py-3 border-b border-canvas-200 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <Link href="/fridge" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center">
            <ChefHat className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] text-stone-400 leading-none">Bonjour</p>
            <p className="font-semibold text-stone-900 text-sm leading-tight">{userName}</p>
          </div>
        </Link>
      </div>
    </header>
  );
}

// ─── Mobile bottom nav ─────────────────────────────────────────────────────

export function AppMobileNav() {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === '/feed' || href === '/discover' || href === '/compare') return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-canvas-200 safe-area-inset-bottom z-20">
      <div className="flex overflow-x-auto [&::-webkit-scrollbar]:hidden px-1 py-2 gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col flex-shrink-0 items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all ${
                active ? 'text-brand-500' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.shortLabel}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
