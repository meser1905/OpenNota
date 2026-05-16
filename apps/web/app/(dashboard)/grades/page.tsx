'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/crud/data-states';
import { GradeCell } from '@/components/grades/grade-cell';
import { WeightConfigDialog } from '@/components/grades/weight-config-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { GradeSheet, SubjectWithClassGroup, Term } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

export default function GradesPage() {
  const t = useTranslations('grades');
  const tType = useTranslations('evaluationTypes');
  const api = useApiClient();

  const [subjectId, setSubjectId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');
  const [weightOpen, setWeightOpen] = useState(false);

  const subjects = useQuery({
    queryKey: ['subjects', 'mine'],
    queryFn: () => api.get<SubjectWithClassGroup[]>('/subjects/mine'),
  });

  const terms = useQuery({
    queryKey: ['terms', 'all'],
    queryFn: () => api.get<Term[]>('/terms'),
  });

  const filtersReady = subjectId !== '' && termId !== '';
  const sheet = useQuery({
    queryKey: ['grade-sheet', subjectId, termId],
    queryFn: () => api.get<GradeSheet>('/grades/sheet', { subjectId, termId }),
    enabled: filtersReady,
    // The sheet is fetched once per subject/term; individual cells own their
    // own state and persist independently, so refetching is never needed.
    refetchOnWindowFocus: false,
  });

  /** Indexes grades by `evaluationId|studentId` for O(1) cell lookup. */
  function gradeKey(evaluationId: string, studentId: string): string {
    return `${evaluationId}|${studentId}`;
  }
  const gradesByCell = new Map(
    sheet.data?.grades.map((grade) => [gradeKey(grade.evaluationId, grade.studentId), grade]),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button variant="outline" disabled={!filtersReady} onClick={() => setWeightOpen(true)}>
            <SlidersHorizontal />
            {t('weightConfig')}
          </Button>
        </div>
      </div>

      {!filtersReady ? (
        <EmptyState message={t('selectFilters')} />
      ) : sheet.isPending ? (
        <TableSkeleton />
      ) : sheet.isError ? (
        <ErrorState onRetry={() => void sheet.refetch()} />
      ) : sheet.data.evaluations.length === 0 ? (
        <EmptyState message={t('noEvaluations')} />
      ) : sheet.data.students.length === 0 ? (
        <EmptyState message={t('noStudents')} />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="bg-card sticky left-0 z-10 min-w-[12rem]">
                  {t('student')}
                </TableHead>
                {sheet.data.evaluations.map((evaluation) => (
                  <TableHead key={evaluation.id} className="min-w-[10rem]">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium">{evaluation.title}</span>
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-normal">
                        {tType(evaluation.type)}
                        {!evaluation.isPublished ? (
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {t('draft')}
                          </Badge>
                        ) : null}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheet.data.students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="bg-card sticky left-0 z-10 font-medium">
                    {student.lastName}, {student.firstName}
                    <span className="text-muted-foreground block text-xs font-normal">
                      {student.studentNumber}
                    </span>
                  </TableCell>
                  {sheet.data.evaluations.map((evaluation) => (
                    <TableCell key={evaluation.id}>
                      <GradeCell
                        api={api}
                        evaluation={evaluation}
                        studentId={student.id}
                        initialGrade={gradesByCell.get(gradeKey(evaluation.id, student.id))}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {sheet.data?.evaluations.some((evaluation) => !evaluation.isPublished) ? (
        <p className="text-muted-foreground text-sm">{t('draftHint')}</p>
      ) : null}

      {filtersReady ? (
        <WeightConfigDialog
          open={weightOpen}
          onOpenChange={setWeightOpen}
          subjectId={subjectId}
          termId={termId}
        />
      ) : null}
    </div>
  );
}
