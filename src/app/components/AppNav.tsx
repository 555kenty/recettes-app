'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ChefHat, Lightbulb, Compass, ShoppingCart, User, LogOut, Users, Scale, Activity,
  Utensils, MoreHorizontal, X,
} from 'lucide-react';
import { signOut } from '@/lib/auth-client';
import { useT } from '@/i18n';
import { LanguageSwitcher } from '@/app/components/LanguageSwitcher';

// ─── Types ─────────────────────────────────────────────────────────────────

interface NavItemDef {
  href: string;
  labelKey: string;
  shortLabelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppNavProps {
  userName: string;
  goalLabel: string;
  userEmail?: string;
}

// ─── Navigation items ──────────────────────────────────────────────────────

const PLUS_ITEMS = [
  { href: '/suggestions', label: 'Suggestions', icon: Lightbulb },
  { href: '/feed',        label: 'Communauté',  icon: Users },
  { href: '/nutrition',   label: 'Nutrition',   icon: Activity },
  { href: '/compare',     label: 'Comparer',    icon: Scale },
  { href: '/shopping',    label: 'Courses',     icon: ShoppingCart },
];

const NAV_ITEMS: NavItemDef[] = [
  { href: '/fridge',      labelKey: 'nav.fridge',      shortLabelKey: 'nav_short.fridge',      icon: ChefHat },
  { href: '/suggestions', labelKey: 'nav.suggestions', shortLabelKey: 'nav_short.suggestions', icon: Lightbulb },
  { href: '/discover',    labelKey: 'nav.discover',    shortLabelKey: 'nav_short.discover',    icon: Compass },
  { href: '/feed',        labelKey: 'nav.feed',        shortLabelKey: 'nav_short.feed',        icon: Users },
  { href: '/nutrition',   labelKey: 'nav.nutrition',   shortLabelKey: 'nav_short.nutrition',   icon: Activity },
  { href: '/compare',     labelKey: 'nav.compare',     shortLabelKey: 'nav_short.compare',     icon: Scale },
  { href: '/shopping',    labelKey: 'nav.shopping',    shortLabelKey: 'nav_short.shopping',    icon: ShoppingCart },
  { href: '/profile',     labelKey: 'nav.profile',     shortLabelKey: 'nav_short.profile',     icon: User },
];

// ─── Sidebar (desktop) ────────────────────────────────────────────────────

export function AppSidebar({ userName, goalLabel }: AppNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();

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
                <span className="flex-1 text-left">{t(item.labelKey)}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Language switcher */}
      <div className="px-4 py-2 border-t border-canvas-200">
        <LanguageSwitcher />
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
            title={t('common.logout')}
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
  const initials = userName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

  return (
    <header className="lg:hidden bg-stone-800 px-4 py-3 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <Link href="/fridge" className="flex items-center gap-2.5">
          <Utensils className="w-5 h-5 text-brand-500" />
          <span className="font-semibold text-white text-sm">CuisineConnect</span>
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher compact />
          <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{initials}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Mobile bottom nav ─────────────────────────────────────────────────────

export function AppMobileNav() {
  const pathname = usePathname();
  const [plusOpen, setPlusOpen] = useState(false);

  const isActive = (href: string): boolean => {
    if (href === '/feed' || href === '/discover' || href === '/compare') return pathname === href;
    return pathname.startsWith(href);
  };

  const plusActive = PLUS_ITEMS.some((i) => isActive(i.href));

  return (
    <>
      {/* Plus overlay */}
      {plusOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30"
          onClick={() => setPlusOpen(false)}
        >
          <div
            className="absolute bottom-20 left-4 right-4 bg-canvas-50 rounded-2xl shadow-float p-2 grid grid-cols-5 gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            {PLUS_ITEMS.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setPlusOpen(false)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl transition-all ${
                    active ? 'bg-brand-500/15 text-brand-500' : 'text-stone-500 hover:bg-stone-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main nav */}
      <nav className="lg:hidden fixed bottom-4 left-4 right-4 z-40">
        <div className="flex items-center gap-0.5 bg-canvas-50 rounded-2xl shadow-float px-1.5 py-1.5">
          {/* Profile */}
          <Link
            href="/profile"
            className={`flex-1 flex items-center justify-center py-2.5 rounded-xl transition-all ${
              isActive('/profile') ? 'bg-brand-500/15 text-brand-500' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
            }`}
          >
            <User className="w-5 h-5" />
          </Link>

          {/* Découvrir */}
          <Link
            href="/discover"
            className={`flex-1 flex items-center justify-center py-2.5 rounded-xl transition-all ${
              isActive('/discover') ? 'bg-brand-500/15 text-brand-500' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Compass className="w-5 h-5" />
          </Link>

          {/* Fridge — central */}
          <Link
            href="/fridge"
            className={`flex-1 flex items-center justify-center py-2.5 rounded-xl transition-all ${
              isActive('/fridge') ? 'bg-brand-500/15 text-brand-500' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
            }`}
          >
            <ChefHat className="w-5 h-5" />
          </Link>

          {/* Plus */}
          <button
            onClick={() => setPlusOpen((o) => !o)}
            className={`flex-1 flex items-center justify-center py-2.5 rounded-xl transition-all ${
              plusActive || plusOpen ? 'bg-brand-500/15 text-brand-500' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'
            }`}
          >
            {plusOpen ? <X className="w-5 h-5" /> : <MoreHorizontal className="w-5 h-5" />}
          </button>
        </div>
      </nav>
    </>
  );
}
