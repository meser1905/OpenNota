'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateInstitutionInput,
  createInstitutionSchema,
  updateInstitutionSchema,
} from '@opennota/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { ConfirmDeleteDialog } from '@/components/crud/confirm-delete-dialog';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/crud/data-states';
import { FormField } from '@/components/crud/form-field';
import { PageHeader } from '@/components/crud/page-header';
import { RowActions } from '@/components/crud/row-actions';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError } from '@/lib/api-client';
import type { Institution } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

const QUERY_KEY = ['institutions'];

export default function InstitutionsPage() {
  const t = useTranslations('institutions');
  const tc = useTranslations('common');
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [deleting, setDeleting] = useState<Institution | null>(null);

  const list = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => api.get<Institution[]>('/institutions'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateInstitutionInput>({
    resolver: zodResolver(editing ? updateInstitutionSchema : createInstitutionSchema),
  });

  function openCreate() {
    setEditing(null);
    reset({ name: '', taxId: '', address: '', phone: '', email: '' });
    setFormOpen(true);
  }

  function openEdit(institution: Institution) {
    setEditing(institution);
    reset({
      name: institution.name,
      taxId: institution.taxId ?? '',
      address: institution.address ?? '',
      phone: institution.phone ?? '',
      email: institution.email ?? '',
    });
    setFormOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (values: CreateInstitutionInput) => {
      const body = {
        name: values.name,
        taxId: values.taxId || undefined,
        address: values.address || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
      };
      return editing
        ? api.patch<Institution>(`/institutions/${editing.id}`, body)
        : api.post<Institution>('/institutions', body);
    },
    onSuccess: () => {
      toast.success(tc('saved'));
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/institutions/${id}`),
    onSuccess: () => {
      toast.success(tc('deleted'));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
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
      />

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
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('taxId')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('phone')}</TableHead>
                <TableHead className="w-12 text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((institution) => (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>{institution.taxId ?? '-'}</TableCell>
                  <TableCell>{institution.email ?? '-'}</TableCell>
                  <TableCell>{institution.phone ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      onEdit={() => openEdit(institution)}
                      onDelete={() => setDeleting(institution)}
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
            <FormField id="name" label={t('name')} error={errors.name?.message}>
              <Input id="name" {...register('name')} />
            </FormField>
            <FormField id="taxId" label={t('taxId')} error={errors.taxId?.message}>
              <Input id="taxId" {...register('taxId')} />
            </FormField>
            <FormField id="address" label={t('address')} error={errors.address?.message}>
              <Input id="address" {...register('address')} />
            </FormField>
            <FormField id="phone" label={t('phone')} error={errors.phone?.message}>
              <Input id="phone" {...register('phone')} />
            </FormField>
            <FormField id="email" label={t('email')} error={errors.email?.message}>
              <Input id="email" type="email" {...register('email')} />
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
