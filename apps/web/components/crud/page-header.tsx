'use client';

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  actionLabel: string;
  onAction: () => void;
  /** Optional extra controls (e.g. filter selects) rendered next to the button. */
  children?: ReactNode;
}

/** Shared management-screen header: title, subtitle, filters and a "New" button. */
export function PageHeader({ title, subtitle, actionLabel, onAction, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {children}
        <Button onClick={onAction}>
          <Plus />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
