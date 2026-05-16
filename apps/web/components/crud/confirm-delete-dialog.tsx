'use client';

import { useTranslations } from 'next-intl';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ConfirmDeleteDialogProps {
  /** Whether the dialog is open; controlled by the parent. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The body text describing what will be deleted. */
  description: string;
  onConfirm: () => void;
  isPending?: boolean;
}

/** A reusable destructive-confirmation dialog used by every management screen. */
export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  description,
  onConfirm,
  isPending = false,
}: ConfirmDeleteDialogProps) {
  const t = useTranslations('common');
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: 'destructive' }))}
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? t('loading') : t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
