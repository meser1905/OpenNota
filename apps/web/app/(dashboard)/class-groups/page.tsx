'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateClassGroupInput,
  createClassGroupSchema,
  EDUCATION_LEVELS,
  updateClassGroupSchema,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import type { AcademicYear, ClassGroup } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

export default function ClassGroupsPage() {
  const t = useTranslations('classGroups');
  const tc = useTranslations('common');
  const tl = useTranslations('educationLevels');
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [yearFilter, setYearFilter] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ClassGroup | null>(null);
  const [deleting, setDeleting] = useState<ClassGroup | null>(null);

  const years = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => api.get<AcademicYear[]>('/academic-years'),
  });

  const list = useQuery({
    queryKey: ['class-groups', yearFilter],
    queryFn: () =>
      api.get<ClassGroup[]>(
        '/class-groups',
        yearFilter ? { academicYearId: yearFilter } : undefined,
      ),
    enabled: yearFilter !== '',
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateClassGroupInput>({
    resolver: zodResolver(editing ? updateClassGroupSchema : createClassGroupSchema),
  });

  function openCreate() {
    setEditing(null);
    reset({
      academicYearId: yearFilter,
      name: '',
      level: 'PRIMARY',
      year: 1,
      section: '',
    });
    setFormOpen(true);
  }

  function openEdit(group: ClassGroup) {
    setEditing(group);
    reset({
      academicYearId: group.academicYearId,
      name: group.name,
      level: group.level,
      year: group.year,
      section: group.section,
    });
    setFormOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (values: CreateClassGroupInput) =>
      editing
        ? api.patch<ClassGroup>(`/class-groups/${editing.id}`, {
            name: values.name,
            level: values.level,
            year: values.year,
            section: values.section,
          })
        : api.post<ClassGroup>('/class-groups', values),
    onSuccess: () => {
      toast.success(tc('saved'));
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['class-groups'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/class-groups/${id}`),
    onSuccess: () => {
      toast.success(tc('deleted'));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['class-groups'] });
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
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t('filterByAcademicYear')} />
          </SelectTrigger>
          <SelectContent>
            {years.data?.map((year) => (
              <SelectItem key={year.id} value={year.id}>
                {year.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {yearFilter === '' ? (
        <EmptyState message={t('selectAcademicYear')} />
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
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('level')}</TableHead>
                <TableHead>{t('year')}</TableHead>
                <TableHead>{t('section')}</TableHead>
                <TableHead className="w-12 text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-medium">{group.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tl(group.level)}</Badge>
                  </TableCell>
                  <TableCell>{group.year}</TableCell>
                  <TableCell>{group.section}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      onEdit={() => openEdit(group)}
                      onDelete={() => setDeleting(group)}
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
            <Controller
              control={control}
              name="academicYearId"
              render={({ field }) => (
                <FormField
                  id="academicYearId"
                  label={t('academicYear')}
                  error={errors.academicYearId?.message}
                >
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={editing !== null}
                  >
                    <SelectTrigger id="academicYearId">
                      <SelectValue placeholder={t('selectAcademicYear')} />
                    </SelectTrigger>
                    <SelectContent>
                      {years.data?.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField id="name" label={t('name')} error={errors.name?.message}>
              <Input id="name" {...register('name')} />
            </FormField>
            <Controller
              control={control}
              name="level"
              render={({ field }) => (
                <FormField id="level" label={t('level')} error={errors.level?.message}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="level">
                      <SelectValue placeholder={t('selectLevel')} />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((level) => (
                        <SelectItem key={level} value={level}>
                          {tl(level)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField id="year" label={t('year')} error={errors.year?.message}>
              <Input id="year" type="number" {...register('year', { valueAsNumber: true })} />
            </FormField>
            <FormField id="section" label={t('section')} error={errors.section?.message}>
              <Input id="section" {...register('section')} />
            </FormField>
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
