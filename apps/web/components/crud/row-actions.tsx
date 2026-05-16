'use client';

import type { ReactNode } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RowActionsProps {
  onEdit?: () => void;
  onDelete: () => void;
  /** Optional extra menu items rendered above edit/delete. */
  children?: ReactNode;
}

/** A row-level actions menu with optional extra items, edit and delete. */
export function RowActions({ onEdit, onDelete, children }: RowActionsProps) {
  const t = useTranslations('common');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal />
          <span className="sr-only">{t('openMenu')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {children}
        {onEdit ? (
          <DropdownMenuItem onSelect={onEdit}>
            <Pencil />
            {t('edit')}
          </DropdownMenuItem>
        ) : null}
        {onEdit ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={onDelete}>
          <Trash2 />
          {t('delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
