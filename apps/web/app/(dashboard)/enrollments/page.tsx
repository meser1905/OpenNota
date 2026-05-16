'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { type EnrollStudentInput, enrollStudentSchema } from '@opennota/shared';
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
import type { ClassGroup, Enrollment, UserWithProfiles } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

export default function EnrollmentsPage() {
  const t = useTranslations('enrollments');
  const tc = useTranslations('common');
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [classGroupFilter, setClassGroupFilter] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Enrollment | null>(null);

  const classGroups = useQuery({
    queryKey: ['class-groups', 'all'],
    queryFn: () => api.get<ClassGroup[]>('/class-groups'),
  });

  const list = useQuery({
    queryKey: ['enrollments', classGroupFilter],
    queryFn: () => api.get<Enrollment[]>('/enrollments', { classGroupId: classGroupFilter }),
    enabled: classGroupFilter !== '',
  });

  // The list endpoint omits profiles, so each student user is fetched in
  // detail to obtain the StudentProfile id required to enroll.
  const studentOptions = useQuery({
    queryKey: ['student-options'],
    queryFn: async () => {
      const users = await api.get<UserWithProfiles[]>('/users', { role: 'STUDENT' });
      const detailed = await Promise.all(
        users.map((user) => api.get<UserWithProfiles>(`/users/${user.id}`)),
      );
      return detailed.filter((user) => user.studentProfile !== null);
    },
    enabled: formOpen,
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EnrollStudentInput>({
    resolver: zodResolver(enrollStudentSchema),
  });

  function openCreate() {
    const group = classGroups.data?.find((item) => item.id === classGroupFilter);
    reset({
      studentId: '',
      classGroupId: classGroupFilter,
      academicYearId: group?.academicYearId ?? '',
    });
    setFormOpen(true);
  }

  const enrollMutation = useMutation({
    mutationFn: (values: EnrollStudentInput) => api.post<Enrollment>('/enrollments', values),
    onSuccess: () => {
      toast.success(tc('saved'));
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/enrollments/${id}`),
    onSuccess: () => {
      toast.success(tc('deleted'));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const onSubmit = handleSubmit((values) => enrollMutation.mutate(values));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actionLabel={t('new')}
        onAction={openCreate}
      >
        <Select value={classGroupFilter} onValueChange={setClassGroupFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder={t('filterByClassGroup')} />
          </SelectTrigger>
          <SelectContent>
            {classGroups.data?.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PageHeader>

      {classGroupFilter === '' ? (
        <EmptyState message={t('selectClassGroup')} />
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
                <TableHead>{t('student')}</TableHead>
                <TableHead>{t('studentNumber')}</TableHead>
                <TableHead>{t('enrolledAt')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="w-12 text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium">
                    {enrollment.student.user.firstName} {enrollment.student.user.lastName}
                  </TableCell>
                  <TableCell>{enrollment.student.studentNumber}</TableCell>
                  <TableCell>{enrollment.enrolledAt.slice(0, 10)}</TableCell>
                  <TableCell>
                    <Badge variant={enrollment.isActive ? 'success' : 'outline'}>
                      {enrollment.isActive ? tc('active') : tc('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions onDelete={() => setDeleting(enrollment)} />
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
            <DialogTitle>{t('createTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Controller
              control={control}
              name="studentId"
              render={({ field }) => (
                <FormField id="studentId" label={t('student')} error={errors.studentId?.message}>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="studentId">
                      <SelectValue placeholder={t('selectStudent')} />
                    </SelectTrigger>
                    <SelectContent>
                      {studentOptions.data?.length === 0 ? (
                        <div className="text-muted-foreground px-2 py-1.5 text-sm">
                          {t('noStudents')}
                        </div>
                      ) : (
                        studentOptions.data?.map((student) => (
                          <SelectItem
                            key={student.studentProfile?.id}
                            value={student.studentProfile?.id ?? ''}
                          >
                            {student.firstName} {student.lastName} (
                            {student.studentProfile?.studentNumber})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
                disabled={enrollMutation.isPending}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={enrollMutation.isPending}>
                {enrollMutation.isPending ? tc('saving') : tc('save')}
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
