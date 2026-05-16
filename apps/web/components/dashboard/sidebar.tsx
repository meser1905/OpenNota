'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { UserRole } from '@opennota/shared';
import { cn } from '@/lib/utils';
import { NAV_ITEMS } from './nav-config';

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="bg-card hidden w-60 shrink-0 flex-col border-r md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <GraduationCap className="text-primary size-6" />
        <span className="text-lg font-semibold">OpenNota</span>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="size-4" />
              {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
