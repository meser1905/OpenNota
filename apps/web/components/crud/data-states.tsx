'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/** A skeleton placeholder shown while a list query is loading. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full" />
      ))}
    </div>
  );
}

/** An error panel with a retry button, shown when a query fails. */
export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('common');
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center">
      <p className="text-muted-foreground text-sm">{t('loadFailed')}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        {t('retry')}
      </Button>
    </div>
  );
}

/** An empty-state panel shown when a list query returns no rows. */
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
