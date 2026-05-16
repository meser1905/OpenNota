'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  type AssignTeacherInput,
  assignTeacherSchema,
  type CreateSubjectInput,
  createSubjectSchema,
  updateSubjectSchema,
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
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api-client';
import type { ClassGroup, Subject, TeacherSubject, UserWithProfiles } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

export default function SubjectsPage() {
  const t = useTranslations('subjects');
  const tc = useTranslations('common');
  const api = useApiClient();
  const queryClient = useQueryClient();

  const [classGroupFilter, setClassGroupFilter] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [teachersSubject, setTeachersSubject] = useState<Subject | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [removingTeacher, setRemovingTeacher] = useState<TeacherSubject | null>(null);

  const classGroups = useQuery({
    queryKey: ['class-groups', 'all'],
    queryFn: () => api.get<ClassGroup[]>('/class-groups'),
  });

  const list = useQuery({
    queryKey: ['subjects', classGroupFilter],
    queryFn: () =>
      api.get<Subject[]>(
        '/subjects',
        classGroupFilter ? { classGroupId: classGroupFilter } : undefined,
      ),
    enabled: classGroupFilter !== '',
  });

  const teachers = useQuery({
    queryKey: ['subject-teachers', teachersSubject?.id],
    queryFn: () => api.get<TeacherSubject[]>(`/subjects/${teachersSubject?.id}/teachers`),
    enabled: teachersSubject !== null,
  });

  // Teacher users do not carry their profile in the list endpoint, so each is
  // fetched in detail to obtain the TeacherProfile id needed for assignment.
  const teacherOptions = useQuery({
    queryKey: ['teacher-options'],
    queryFn: async () => {
      const users = await api.get<UserWithProfiles[]>('/users', { role: 'TEACHER' });
      const detailed = await Promise.all(
        users.map((user) => api.get<UserWithProfiles>(`/users/${user.id}`)),
      );
      return detailed.filter((user) => user.teacherProfile !== null);
    },
    enabled: assignOpen,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateSubjectInput>({
    resolver: zodResolver(editing ? updateSubjectSchema : createSubjectSchema),
  });

  const assignForm = useForm<AssignTeacherInput>({
    resolver: zodResolver(assignTeacherSchema),
  });

  function openCreate() {
    setEditing(null);
    reset({ classGroupId: classGroupFilter, name: '', description: '', color: '' });
    setFormOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    reset({
      classGroupId: subject.classGroupId,
      name: subject.name,
      description: subject.description ?? '',
      color: subject.color ?? '',
    });
    setFormOpen(true);
  }

  const saveMutation = useMutation({
    mutationFn: (values: CreateSubjectInput) => {
      const body = {
        name: values.name,
        description: values.description || undefined,
        color: values.color || undefined,
      };
      return editing
        ? api.patch<Subject>(`/subjects/${editing.id}`, body)
        : api.post<Subject>('/subjects', { ...body, classGroupId: values.classGroupId });
    },
    onSuccess: () => {
      toast.success(tc('saved'));
      setFormOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/subjects/${id}`),
    onSuccess: () => {
      toast.success(tc('deleted'));
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ['subjects'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  function openAssign() {
    assignForm.reset({
      teacherId: '',
      subjectId: teachersSubject?.id ?? '',
      isLead: false,
    });
    setAssignOpen(true);
  }

  const assignMutation = useMutation({
    mutationFn: (values: AssignTeacherInput) => {
      if (!teachersSubject) throw new Error('No subject selected');
      return api.post<TeacherSubject>(`/subjects/${teachersSubject.id}/teachers`, values);
    },
    onSuccess: () => {
      toast.success(tc('saved'));
      setAssignOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['subject-teachers'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const removeTeacherMutation = useMutation({
    mutationFn: (assignment: TeacherSubject) =>
      api.del(`/subjects/${assignment.subjectId}/teachers/${assignment.id}`),
    onSuccess: () => {
      toast.success(tc('deleted'));
      setRemovingTeacher(null);
      void queryClient.invalidateQueries({ queryKey: ['subject-teachers'] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : tc('error'));
    },
  });

  const onSubmit = handleSubmit((values) => saveMutation.mutate(values));
  const onAssign = assignForm.handleSubmit((values) => assignMutation.mutate(values));

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
                <TableHead>{t('name')}</TableHead>
                <TableHead>{t('description')}</TableHead>
                <TableHead>{t('color')}</TableHead>
                <TableHead className="w-12 text-right">{tc('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((subject) => (
                <TableRow key={subject.id}>
                  <TableCell className="font-medium">{subject.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">
                    {subject.description ?? '-'}
                  </TableCell>
                  <TableCell>
                    {subject.color ? (
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block size-4 rounded-full border"
                          style={{ backgroundColor: subject.color }}
                        />
                        {subject.color}
                      </span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <RowActions
                      onEdit={() => openEdit(subject)}
                      onDelete={() => setDeleting(subject)}
                    >
                      <DropdownMenuItem onSelect={() => setTeachersSubject(subject)}>
                        {t('manageTeachers')}
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

      {/* Subject create/edit dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('editTitle') : t('createTitle')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Controller
              control={control}
              name="classGroupId"
              render={({ field }) => (
                <FormField
                  id="classGroupId"
                  label={t('classGroup')}
                  error={errors.classGroupId?.message}
                >
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={editing !== null}
                  >
                    <SelectTrigger id="classGroupId">
                      <SelectValue placeholder={t('selectClassGroup')} />
                    </SelectTrigger>
                    <SelectContent>
                      {classGroups.data?.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
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
            <FormField
              id="description"
              label={t('description')}
              error={errors.description?.message}
            >
              <Textarea id="description" {...register('description')} />
            </FormField>
            <FormField id="color" label={t('color')} error={errors.color?.message}>
              <Input id="color" placeholder="#2563eb" {...register('color')} />
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

      {/* Teacher assignments dialog */}
      <Dialog
        open={teachersSubject !== null}
        onOpenChange={(open) => {
          if (!open) setTeachersSubject(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {teachersSubject
                ? t('teachersFor', { subject: teachersSubject.name })
                : t('teachers')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={openAssign}>
                {t('assignTeacher')}
              </Button>
            </div>
            {teachers.isPending ? (
              <TableSkeleton rows={3} />
            ) : teachers.isError ? (
              <ErrorState onRetry={() => void teachers.refetch()} />
            ) : teachers.data.length === 0 ? (
              <EmptyState message={t('teachersEmpty')} />
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('teacher')}</TableHead>
                      <TableHead>{t('lead')}</TableHead>
                      <TableHead className="w-12 text-right">{tc('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teachers.data.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.teacher.user.firstName} {assignment.teacher.user.lastName}
                        </TableCell>
                        <TableCell>
                          {assignment.isLead ? <Badge variant="secondary">{t('lead')}</Badge> : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <RowActions onDelete={() => setRemovingTeacher(assignment)} />
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

      {/* Assign teacher dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('assignTeacher')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onAssign} className="space-y-4" noValidate>
            <Controller
              control={assignForm.control}
              name="teacherId"
              render={({ field }) => (
                <FormField
                  id="teacherId"
                  label={t('teacher')}
                  error={assignForm.formState.errors.teacherId?.message}
                >
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="teacherId">
                      <SelectValue placeholder={t('selectTeacher')} />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherOptions.data?.map((teacher) => (
                        <SelectItem
                          key={teacher.teacherProfile?.id}
                          value={teacher.teacherProfile?.id ?? ''}
                        >
                          {teacher.firstName} {teacher.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              )}
            />
            <Controller
              control={assignForm.control}
              name="isLead"
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <Label htmlFor="isLead">{t('isLead')}</Label>
                  <Switch
                    id="isLead"
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
                onClick={() => setAssignOpen(false)}
                disabled={assignMutation.isPending}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" disabled={assignMutation.isPending}>
                {assignMutation.isPending ? tc('saving') : tc('save')}
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

      <ConfirmDeleteDialog
        open={removingTeacher !== null}
        onOpenChange={(open) => {
          if (!open) setRemovingTeacher(null);
        }}
        description={t('removeTeacherConfirm')}
        isPending={removeTeacherMutation.isPending}
        onConfirm={() => {
          if (removingTeacher) removeTeacherMutation.mutate(removingTeacher);
        }}
      />
    </div>
  );
}
