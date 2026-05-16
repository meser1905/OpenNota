'use client';

import { LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import type { UserRole } from '@opennota/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopbarProps {
  user: { firstName: string; lastName: string; email?: string | null; role: UserRole };
}

export function Topbar({ user }: TopbarProps) {
  const t = useTranslations();
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  return (
    <header className="bg-card flex h-16 items-center justify-end border-b px-6">
      <DropdownMenu>
        <DropdownMenuTrigger className="focus-visible:ring-ring flex items-center gap-3 rounded-full outline-none focus-visible:ring-2">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-muted-foreground text-xs">{t(`roles.${user.role}`)}</p>
          </div>
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="text-muted-foreground font-normal">
            {user.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signOut({ callbackUrl: '/login' })}>
            <LogOut />
            {t('auth.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
