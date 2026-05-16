'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createAcademicYearSchema,
  createTermSchema,
  TERM_TYPES,
  updateAcademicYearSchema,
  updateTermSchema,
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
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
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
import { ApiError } from '@/lib/api-client';
import type { AcademicYear, Institution, Term } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

const ALL = 'ALL';

/** Slices an ISO datetime to the `yyyy-mm-dd` a date input expects. */
function toDateInput(iso: string): string {
  return iso.slice(0, 10);
}

/** Form values for the academic-year dialog; dates are strings, coerced by Zod. */
interface YearFormValues {
  institutionId: string;
  year: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

/** Form values for the term dialog. */
interface TermFormValues {
  academicYearId: string;
  name: string;
  type: (typeof TERM_TYPES)[number];
  number: number;
  startDate: string;
  endDate: string;
}

export default function AcademicYearsPage() {
  const t = useTranslations('academicYears');
  const tc = useTranslations('common');
  const tt = useTranslations('termTypes');
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [institutionFilter, setInstitutionFilter] = useState<string>(ALL);
  const [yearFormOpen, setYearFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [deletingYear, setDeletingYear] = useState<AcademicYear | null>(null);
  const [termsYear, setTermsYear] = useState<AcademicYear | null>(null);
  const [termFormOpen, setTermFormOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [deletingTerm, setDeletingTerm] = useState<Term | null>(null);

  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: () => api.get<Institution[]>('/institutions'),
  });

  const list = useQuery({
    queryKey: ['academic-years', institutionFilter],
    queryFn: () =>
      api.get<AcademicYear[]>(
        '/academic-years',
        institutionFilter === ALL ? undefined : { institutionId: institutionFilter },
      ),
  });

  const terms = useQuery({
    queryKey: ['terms', termsYear?.id],
    queryFn: () => api.get<Term[]>('/terms', { academicYearId: termsYear?.id }),
    enabled: termsYear !== null,
  });

  const yearForm = useForm<YearFormValues>({
    resolver: zodResolver(editingYear ? updateAcademicYearSchema : createAcademicYearSchema),
  });
  const termForm = useForm<TermFormValues>({
    resolver: zodResolver(editingTerm ? updateTermSchema : createTermSchema),
  });

  function openCreateYear() {
    setEditingYear(null);
    yearForm.reset({
      institutionId: institutionFilter === ALL ? '' : institutionFilter,
      year: new Date().getFullYear(),
      startDate: '',
      endDate: '',
      isActive: false,
    });
    setYearFormOpen(true);
  }

  function openEditYear(year: AcademicYear) {
    setEditingYear(year);
    yearForm.reset({
      institutionId: year.institutionId,
      year: year.year,
      startDate: toDateInput(year.startDate),
      endDate: toDateInput(year.endDate),
      isActive: year.isActive,
    });
    setYearFormOpen(true);
  }

  const saveYear = useMutation({
    mutationFn: (values: YearFormValues) =>
      editingYear
        ? api.patch<AcademicYear>(`/academic-years/${editingYear.id}`, {
            year: values.year,
            startDate: values.startDate,
            endDate: values.endDate,
            isActive: values.isActive,
          })
        : api.post<AcademicYear>('/academic-years', values),
    onSuccess: () => {
      toast.success(tc('saved'));
      setYearFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const deleteYear = useMutation({
    mutationFn: (id: string) => api.del(`/academic-years/${id}`),
    onSuccess: () => {
      toast.success(tc('deleted'));
      setDeletingYear(null);
      void queryClient.invalidateQueries({ queryKey: ['academic-years'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  function openCreateTerm() {
    if (!termsYear) return;
    setEditingTerm(null);
    termForm.reset({
      academicYearId: termsYear.id,
      name: '',
      type: 'TRIMESTER',
      number: 1,
      startDate: '',
      endDate: '',
    });
    setTermFormOpen(true);
  }

  function openEditTerm(term: Term) {
    setEditingTerm(term);
    termForm.reset({
      academicYearId: term.academicYearId,
      name: term.name,
      type: term.type,
      number: term.number,
      startDate: toDateInput(term.startDate),
      endDate: toDateInput(term.endDate),
    });
    setTermFormOpen(true);
  }

  const saveTerm = useMutation({
    mutationFn: (values: TermFormValues) =>
      editingTerm
        ? api.patch<Term>(`/terms/${editingTerm.id}`, {
            name: values.name,
            type: values.type,
            number: values.number,
            startDate: values.startDate,
            endDate: values.endDate,
          })
        : api.post<Term>('/terms', values),
    onSuccess: () => {
      toast.success(tc('saved'));
      setTermFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const deleteTerm = useMutation({
    mutationFn: (id: string) => api.del(`/terms/${id}`),
    onSuccess: () => {
      toast.success(tc('deleted'));
      setDeletingTerm(null);
      void queryClient.invalidateQueries({ queryKey: ['terms'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const onSubmitYear = yearForm.handleSubmit((values) => saveYear.mutate(values));
  const onSubmitTerm = termForm.handleSubmit((values) => saveTerm.mutate(values));
  const institutionName = (id: string) => institutions.data?.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actionLabel={t('new')}
        onAction={openCreateYear}
      >
        <Select value={institutionFilter} onValueChange={setInstitutionFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t('filterByInstitution')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{tc('all')}</SelectItem>
            {institutions.data?.map((institution) => (
              <SelectItem key={institution.id} value={institution.id}>
                {institution.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {list.isPending ? (
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
                <TableHead>{t('year')}</TableHead>
                <TableHead>{t('institution')}</TableHead>
                <TableHead>{t('startDate')}</TableHead>
                <TableHead>{t('endDate')}</TableHead>
                <TableHead>{t('active')}</TableHead>
                <TableHead className="w-12 text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((year) => (
                <TableRow key={year.id}>
                  <TableCell className="font-medium">{year.year}</TableCell>
                  <TableCell>{institutionName(year.institutionId)}</TableCell>
                  <TableCell>{toDateInput(year.startDate)}</TableCell>
                  <TableCell>{toDateInput(year.endDate)}</TableCell>
                  <TableCell>
                    {year.isActive ? <Badge variant="success">{t('active')}</Badge> : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      onEdit={() => openEditYear(year)}
                      onDelete={() => setDeletingYear(year)}
                    >
                      <DropdownMenuItem onSelect={() => setTermsYear(year)}>
                        {t('manageTerms')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </RowActions>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Academic year create/edit dialog */}
      <Dialog open={yearFormOpen} onOpenChange={setYearFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingYear ? t('editTitle') : t('createTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmitYear} className="space-y-4" noValidate>
            <Controller
              control={yearForm.control}
              name="institutionId"
              render={({ field }) => (
                <FormField
                  id="institutionId"
                  label={t('institution')}
                  error={yearForm.formState.errors.institutionId?.message}
                >
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={editingYear !== null}
                  >
                    <SelectTrigger id="institutionId">
                      <SelectValue placeholder={t('selectInstitution')} />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.data?.map((institution) => (
                        <SelectItem key={institution.id} value={institution.id}>
                          {institution.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField id="year" label={t('year')} error={yearForm.formState.errors.year?.message}>
              <Input
                id="year"
                type="number"
                {...yearForm.register('year', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              id="startDate"
              label={t('startDate')}
              error={yearForm.formState.errors.startDate?.message}
            >
              <Input id="startDate" type="date" {...yearForm.register('startDate')} />
            </FormField>
            <FormField
              id="endDate"
              label={t('endDate')}
              error={yearForm.formState.errors.endDate?.message}
            >
              <Input id="endDate" type="date" {...yearForm.register('endDate')} />
            </FormField>
            <Controller
              control={yearForm.control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="isActive">{t('active')}</Label>
                  <Switch
                    id="isActive"
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
                onClick={() => setYearFormOpen(false)}
                disabled={saveYear.isPending}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={saveYear.isPending}>
                {saveYear.isPending ? tc('saving') : tc('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Terms management dialog */}
      <Dialog
        open={termsYear !== null}
        onOpenChange={(open) => {
          if (!open) setTermsYear(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {termsYear ? t('termsFor', { year: termsYear.year }) : t('terms')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={openCreateTerm}>
                {t('newTerm')}
              </Button>
            </div>
            {terms.isPending ? (
              <TableSkeleton rows={3} />
            ) : terms.isError ? (
              <ErrorState onRetry={() => void terms.refetch()} />
            ) : terms.data.length === 0 ? (
              <EmptyState message={t('termsEmpty')} />
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('termName')}</TableHead>
                      <TableHead>{t('termType')}</TableHead>
                      <TableHead>{t('termNumber')}</TableHead>
                      <TableHead className="w-12 text-right">{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terms.data.map((term) => (
                      <TableRow key={term.id}>
                        <TableCell className="font-medium">{term.name}</TableCell>
                        <TableCell>{tt(term.type)}</TableCell>
                        <TableCell>{term.number}</TableCell>
                        <TableCell className="text-right">
                          <RowActions
                            onEdit={() => openEditTerm(term)}
                            onDelete={() => setDeletingTerm(term)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Term create/edit dialog */}
      <Dialog open={termFormOpen} onOpenChange={setTermFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTerm ? t('editTermTitle') : t('createTermTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmitTerm} className="space-y-4" noValidate>
            <FormField
              id="termName"
              label={t('termName')}
              error={termForm.formState.errors.name?.message}
            >
              <Input id="termName" {...termForm.register('name')} />
            </FormField>
            <Controller
              control={termForm.control}
              name="type"
              render={({ field }) => (
                <FormField
                  id="termType"
                  label={t('termType')}
                  error={termForm.formState.errors.type?.message}
                >
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="termType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERM_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {tt(type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <FormField
              id="termNumber"
              label={t('termNumber')}
              error={termForm.formState.errors.number?.message}
            >
              <Input
                id="termNumber"
                type="number"
                {...termForm.register('number', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              id="termStartDate"
              label={t('termStartDate')}
              error={termForm.formState.errors.startDate?.message}
            >
              <Input id="termStartDate" type="date" {...termForm.register('startDate')} />
            </FormField>
            <FormField
              id="termEndDate"
              label={t('termEndDate')}
              error={termForm.formState.errors.endDate?.message}
            >
              <Input id="termEndDate" type="date" {...termForm.register('endDate')} />
            </FormField>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTermFormOpen(false)}
                disabled={saveTerm.isPending}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={saveTerm.isPending}>
                {saveTerm.isPending ? tc('saving') : tc('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deletingYear !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingYear(null);
        }}
        description={t('deleteConfirm')}
        isPending={deleteYear.isPending}
        onConfirm={() => {
          if (deletingYear) deleteYear.mutate(deletingYear.id);
        }}
      />

      <ConfirmDeleteDialog
        open={deletingTerm !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingTerm(null);
        }}
        description={t('deleteTermConfirm')}
        isPending={deleteTerm.isPending}
        onConfirm={() => {
          if (deletingTerm) deleteTerm.mutate(deletingTerm.id);
        }}
      />
    </div>
  );
}
