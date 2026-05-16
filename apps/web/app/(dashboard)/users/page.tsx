'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type CreateUserInput,
  createUserSchema,
  type UpdateUserInput,
  updateUserSchema,
  USER_ROLES,
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
import { ApiError } from '@/lib/api-client';
import type { User } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

const ALL = 'ALL';

export default function UsersPage() {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tr = useTranslations('roles');
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<User | null>(null);

  const queryKey = ['users', roleFilter];
  const list = useQuery({
    queryKey,
    queryFn: () => api.get<User[]>('/users', roleFilter === ALL ? undefined : { role: roleFilter }),
  });

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
  });
  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
  });

  function openCreate() {
    setEditing(null);
    createForm.reset({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      role: 'STUDENT',
      isActive: true,
    });
    setFormOpen(true);
  }

  function openEdit(user: User) {
    setEditing(user);
    editForm.reset({
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    });
    setFormOpen(true);
  }

  const createMutation = useMutation({
    mutationFn: (values: CreateUserInput) => api.post<User>('/users', values),
    onSuccess: () => {
      toast.success(tc('saved'));
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: UpdateUserInput) => {
      if (!editing) throw new Error('No user selected');
      return api.patch<User>(`/users/${editing.id}`, values);
    },
    onSuccess: () => {
      toast.success(tc('saved'));
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/users/${id}`),
    onSuccess: () => {
      toast.success(tc('deleted'));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const onCreate = createForm.handleSubmit((values) => createMutation.mutate(values));
  const onUpdate = editForm.handleSubmit((values) => updateMutation.mutate(values));
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actionLabel={t('new')}
        onAction={openCreate}
      >
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder={t('filterByRole')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{tc('all')}</SelectItem>
            {USER_ROLES.map((role) => (
              <SelectItem key={role} value={role}>
                {tr(role)}
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
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('email')}</TableHead>
                <TableHead>{t('role')}</TableHead>
                <TableHead>{t('active')}</TableHead>
                <TableHead className="w-12 text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tr(user.role)}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'outline'}>
                      {user.isActive ? tc('active') : tc('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions onEdit={() => openEdit(user)} onDelete={() => setDeleting(user)} />
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
          {editing ? (
            <form onSubmit={onUpdate} className="space-y-4" noValidate>
              <FormField
                id="firstName"
                label={t('firstName')}
                error={editForm.formState.errors.firstName?.message}
              >
                <Input id="firstName" {...editForm.register('firstName')} />
              </FormField>
              <FormField
                id="lastName"
                label={t('lastName')}
                error={editForm.formState.errors.lastName?.message}
              >
                <Input id="lastName" {...editForm.register('lastName')} />
              </FormField>
              <Controller
                control={editForm.control}
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
                  onClick={() => setFormOpen(false)}
                  disabled={isSaving}
                >
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? tc('saving') : tc('save')}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <form onSubmit={onCreate} className="space-y-4" noValidate>
              <FormField
                id="firstName"
                label={t('firstName')}
                error={createForm.formState.errors.firstName?.message}
              >
                <Input id="firstName" {...createForm.register('firstName')} />
              </FormField>
              <FormField
                id="lastName"
                label={t('lastName')}
                error={createForm.formState.errors.lastName?.message}
              >
                <Input id="lastName" {...createForm.register('lastName')} />
              </FormField>
              <FormField
                id="email"
                label={t('email')}
                error={createForm.formState.errors.email?.message}
              >
                <Input id="email" type="email" {...createForm.register('email')} />
              </FormField>
              <FormField
                id="password"
                label={t('password')}
                error={createForm.formState.errors.password?.message}
              >
                <Input id="password" type="password" {...createForm.register('password')} />
              </FormField>
              <Controller
                control={createForm.control}
                name="role"
                render={({ field }) => (
                  <FormField
                    id="role"
                    label={t('role')}
                    error={createForm.formState.errors.role?.message}
                  >
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="role">
                        <SelectValue placeholder={t('selectRole')} />
                      </SelectTrigger>
                      <SelectContent>
                        {USER_ROLES.map((role) => (
                          <SelectItem key={role} value={role}>
                            {tr(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                )}
              />
              <Controller
                control={createForm.control}
                name="isActive"
                render={({ field }) => (
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isActiveCreate">{t('active')}</Label>
                    <Switch
                      id="isActiveCreate"
                      checked={field.value ?? true}
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
                  disabled={isSaving}
                >
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? tc('saving') : tc('save')}
                </Button>
              </DialogFooter>
            </form>
          )}
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
