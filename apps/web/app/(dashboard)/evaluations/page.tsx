'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createEvaluationSchema,
  EVALUATION_TYPES,
  type EvaluationType,
  GRADE_SCALES,
  type GradeScale,
  updateEvaluationSchema,
} from '@opennota/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/crud/confirm-delete-dialog';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/crud/data-states';
import { FormField } from '@/components/crud/form-field';
import { PageHeader } from '@/components/crud/page-header';
import { RowActions } from '@/components/crud/row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import type { Evaluation, SubjectWithClassGroup, Term } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

/** Form values for the evaluation dialog; `date` is a string coerced by Zod. */
interface EvaluationFormValues {
  title: string;
  description: string;
  type: EvaluationType;
  date: string;
  weight: number;
  scale: GradeScale;
  maxScore: number;
  minScore: number;
  passingScore: number;
  isPublished: boolean;
}

/** Slices an ISO datetime to the `yyyy-mm-dd` a date input expects. */
function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

export default function EvaluationsPage() {
  const t = useTranslations('evaluations');
  const tc = useTranslations('common');
  const tType = useTranslations('evaluationTypes');
  const tScale = useTranslations('gradeScales');
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [subjectId, setSubjectId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Evaluation | null>(null);
  const [deleting, setDeleting] = useState<Evaluation | null>(null);

  const subjects = useQuery({
    queryKey: ['subjects', 'mine'],
    queryFn: () => api.get<SubjectWithClassGroup[]>('/subjects/mine'),
  });

  const terms = useQuery({
    queryKey: ['terms', 'all'],
    queryFn: () => api.get<Term[]>('/terms'),
  });

  const filtersReady = subjectId !== '' && termId !== '';
  const list = useQuery({
    queryKey: ['evaluations', subjectId, termId],
    queryFn: () => api.get<Evaluation[]>('/evaluations', { subjectId, termId }),
    enabled: filtersReady,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EvaluationFormValues>({
    resolver: zodResolver(editing ? updateEvaluationSchema : createEvaluationSchema),
  });

  function openCreate() {
    setEditing(null);
    reset({
      title: '',
      description: '',
      type: 'EXAM',
      date: '',
      weight: 1,
      scale: 'NUMERIC_1_10',
      maxScore: 10,
      minScore: 1,
      passingScore: 6,
      isPublished: false,
    });
    setFormOpen(true);
  }

  function openEdit(evaluation: Evaluation) {
    setEditing(evaluation);
    reset({
      title: evaluation.title,
      description: evaluation.description ?? '',
      type: evaluation.type,
      date: toDateInput(evaluation.date),
      weight: evaluation.weight,
      scale: evaluation.scale,
      maxScore: evaluation.maxScore,
      minScore: evaluation.minScore,
      passingScore: evaluation.passingScore,
      isPublished: evaluation.isPublished,
    });
    setFormOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (values: EvaluationFormValues) => {
      const body = {
        title: values.title,
        description: values.description || undefined,
        type: values.type,
        date: values.date,
        weight: values.weight,
        scale: values.scale,
        maxScore: values.maxScore,
        minScore: values.minScore,
        passingScore: values.passingScore,
        isPublished: values.isPublished,
      };
      return editing
        ? api.patch<Evaluation>(`/evaluations/${editing.id}`, body)
        : api.post<Evaluation>('/evaluations', { ...body, subjectId, termId });
    },
    onSuccess: () => {
      toast.success(tc('saved'));
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/evaluations/${id}`),
    onSuccess: () => {
      toast.success(tc('deleted'));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['evaluations'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actionLabel={t('new')}
        onAction={openCreate}
      >
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t('selectSubject')} />
          </SelectTrigger>
          <SelectContent>
            {subjects.data?.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                {subject.name} ({subject.classGroup.name})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={termId} onValueChange={setTermId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('selectTerm')} />
          </SelectTrigger>
          <SelectContent>
            {terms.data?.map((term) => (
              <SelectItem key={term.id} value={term.id}>
                {term.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {!filtersReady ? (
        <EmptyState message={t('selectFilters')} />
      ) : list.isPending ? (
        <TableSkeleton />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : list.data.length === 0 ? (
        <EmptyState message={t('empty')} />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('evaluationTitle')}</TableHead>
                <TableHead>{t('type')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('scale')}</TableHead>
                <TableHead>{t('weight')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="w-12 text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((evaluation) => (
                <TableRow key={evaluation.id}>
                  <TableCell className="font-medium">{evaluation.title}</TableCell>
                  <TableCell>{tType(evaluation.type)}</TableCell>
                  <TableCell>{toDateInput(evaluation.date)}</TableCell>
                  <TableCell>{tScale(evaluation.scale)}</TableCell>
                  <TableCell>{evaluation.weight}</TableCell>
                  <TableCell>
                    <Badge variant={evaluation.isPublished ? 'success' : 'outline'}>
                      {evaluation.isPublished ? t('published') : t('draft')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      onEdit={() => openEdit(evaluation)}
                      onDelete={() => setDeleting(evaluation)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('editTitle') : t('createTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <FormField id="title" label={t('evaluationTitle')} error={errors.title?.message}>
              <Input id="title" {...register('title')} />
            </FormField>
            <FormField
              id="description"
              label={t('description')}
              error={errors.description?.message}
            >
              <Textarea id="description" {...register('description')} />
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <FormField id="type" label={t('type')} error={errors.type?.message}>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="type">
                        <SelectValue placeholder={t('type')} />
                      </SelectTrigger>
                      <SelectContent>
                        {EVALUATION_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {tType(type)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              />
              <Controller
                control={control}
                name="scale"
                render={({ field }) => (
                  <FormField id="scale" label={t('scale')} error={errors.scale?.message}>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="scale">
                        <SelectValue placeholder={t('scale')} />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_SCALES.map((scale) => (
                          <SelectItem key={scale} value={scale}>
                            {tScale(scale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField id="date" label={t('date')} error={errors.date?.message}>
                <Input id="date" type="date" {...register('date')} />
              </FormField>
              <FormField id="weight" label={t('weight')} error={errors.weight?.message}>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  {...register('weight', { valueAsNumber: true })}
                />
              </FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField id="minScore" label={t('minScore')} error={errors.minScore?.message}>
                <Input
                  id="minScore"
                  type="number"
                  step="0.1"
                  {...register('minScore', { valueAsNumber: true })}
                />
              </FormField>
              <FormField id="maxScore" label={t('maxScore')} error={errors.maxScore?.message}>
                <Input
                  id="maxScore"
                  type="number"
                  step="0.1"
                  {...register('maxScore', { valueAsNumber: true })}
                />
              </FormField>
              <FormField
                id="passingScore"
                label={t('passingScore')}
                error={errors.passingScore?.message}
              >
                <Input
                  id="passingScore"
                  type="number"
                  step="0.1"
                  {...register('passingScore', { valueAsNumber: true })}
                />
              </FormField>
            </div>
            <Controller
              control={control}
              name="isPublished"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="isPublished">{t('published')}</Label>
                  <Switch
                    id="isPublished"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </div>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={saveMutation.isPending}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? tc('saving') : tc('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
        description={t('deleteConfirm')}
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleting) deleteMutation.mutate(deleting.id);
        }}
      />
    </div>
  );
}
