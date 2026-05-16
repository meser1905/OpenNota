'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateGradingWeightConfigInput,
  createGradingWeightConfigSchema,
} from '@opennota/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { FormField } from '@/components/crud/form-field';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-client';
import type { GradingWeightConfig } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

/** The five weight fields, paired with their i18n label key. */
const WEIGHT_FIELDS = [
  { name: 'examWeight', labelKey: 'examWeight' },
  { name: 'assignmentWeight', labelKey: 'assignmentWeight' },
  { name: 'performanceWeight', labelKey: 'performanceWeight' },
  { name: 'oralWeight', labelKey: 'oralWeight' },
  { name: 'projectWeight', labelKey: 'projectWeight' },
] as const;

interface WeightConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  termId: string;
}

/**
 * A dialog form for the per-subject/term evaluation-type weights. The five
 * weights are validated to sum to 100 and saved via `PUT /grading-weights`.
 */
export function WeightConfigDialog({
  open,
  onOpenChange,
  subjectId,
  termId,
}: WeightConfigDialogProps) {
  const t = useTranslations('grades');
  const tc = useTranslations('common');
  const api = useApiClient();
  const queryClient = useQueryClient();

  const current = useQuery({
    queryKey: ['grading-weights', subjectId, termId],
    queryFn: () => api.get<GradingWeightConfig | null>('/grading-weights', { subjectId, termId }),
    enabled: open,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateGradingWeightConfigInput>({
    resolver: zodResolver(createGradingWeightConfigSchema),
  });

  // Seed the form once the current config (or its absence) has loaded.
  useEffect(() => {
    if (!open || current.isPending) return;
    reset({
      subjectId,
      termId,
      examWeight: current.data?.examWeight ?? 20,
      assignmentWeight: current.data?.assignmentWeight ?? 20,
      performanceWeight: current.data?.performanceWeight ?? 20,
      oralWeight: current.data?.oralWeight ?? 20,
      projectWeight: current.data?.projectWeight ?? 20,
    });
  }, [open, current.isPending, current.data, reset, subjectId, termId]);

  const saveMutation = useMutation({
    mutationFn: (values: CreateGradingWeightConfigInput) =>
      api.put<GradingWeightConfig>('/grading-weights', values),
    onSuccess: () => {
      toast.success(t('weightSaved'));
      void queryClient.invalidateQueries({ queryKey: ['grading-weights'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('weightConfig')}</DialogTitle>
          <DialogDescription>{t('weightConfigHint')}</DialogDescription>
        </DialogHeader>
        {current.isPending ? (
          <p className="text-muted-foreground text-sm">{tc('loading')}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {WEIGHT_FIELDS.map((field) => (
              <FormField
                key={field.name}
                id={field.name}
                label={t(field.labelKey)}
                error={errors[field.name]?.message}
              >
                <Input
                  id={field.name}
                  type="number"
                  step="1"
                  min={0}
                  max={100}
                  {...register(field.name, { valueAsNumber: true })}
                />
              </FormField>
            ))}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saveMutation.isPending}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? tc('saving') : tc('save')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
