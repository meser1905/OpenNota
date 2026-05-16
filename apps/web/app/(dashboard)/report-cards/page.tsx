'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/crud/data-states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { ReportCard, ReportCardStudent, Term } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

/** API base URL, matching the resolution in `lib/api-client.ts`. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function ReportCardsPage() {
  const t = useTranslations('reportCards');
  const tc = useTranslations('common');
  const tType = useTranslations('evaluationTypes');
  const tConcept = useTranslations('grades.conceptual');
  const api = useApiClient();
  const { data: session } = useSession();

  const [studentId, setStudentId] = useState<string>('');
  const [termId, setTermId] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  const students = useQuery({
    queryKey: ['report-students'],
    queryFn: () => api.get<ReportCardStudent[]>('/reports/students'),
  });

  const terms = useQuery({
    queryKey: ['terms', 'all'],
    queryFn: () => api.get<Term[]>('/terms'),
  });

  const filtersReady = studentId !== '' && termId !== '';
  const reportCard = useQuery({
    queryKey: ['report-card', studentId, termId],
    queryFn: () => api.get<ReportCard>(`/reports/report-card/${studentId}/${termId}`),
    enabled: filtersReady,
  });

  function toggleRow(subjectId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  }

  /** Renders a subject's pass/fail/pending badge. */
  function statusBadge(subject: ReportCard['subjects'][number]) {
    if (!subject.hasGrades) {
      return <Badge variant="outline">{t('pending')}</Badge>;
    }
    return (
      <Badge variant={subject.passed ? 'success' : 'destructive'}>
        {subject.passed ? t('passed') : t('failed')}
      </Badge>
    );
  }

  /**
   * Downloads the report card PDF. `apiFetch` is JSON-only, so the request is
   * issued directly so the binary body can be read as a Blob.
   */
  async function downloadPdf() {
    const token = session?.accessToken;
    if (!token) return;
    setDownloading(true);
    try {
      const response = await fetch(`${API_URL}/reports/report-card/${studentId}/${termId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new ApiError(response.status, t('downloadError'));
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `boletin-${reportCard.data?.student.studentNumber ?? studentId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : t('downloadError'));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={studentId} onValueChange={setStudentId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder={t('selectStudent')} />
            </SelectTrigger>
            <SelectContent>
              {students.data?.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.lastName}, {student.firstName} ({student.studentNumber})
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
          <Button
            variant="outline"
            disabled={!filtersReady || reportCard.isPending || reportCard.isError || downloading}
            onClick={() => void downloadPdf()}
          >
            <Download />
            {downloading ? tc('loading') : t('downloadPdf')}
          </Button>
        </div>
      </div>

      {!filtersReady ? (
        <EmptyState message={t('selectFilters')} />
      ) : reportCard.isPending ? (
        <TableSkeleton />
      ) : reportCard.isError ? (
        <ErrorState onRetry={() => void reportCard.refetch()} />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {reportCard.data.student.lastName}, {reportCard.data.student.firstName}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-muted-foreground text-sm">{t('classGroup')}</p>
                <p className="font-medium">{reportCard.data.classGroup ?? '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{t('term')}</p>
                <p className="font-medium">{reportCard.data.term.name}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{t('academicYear')}</p>
                <p className="font-medium">{reportCard.data.academicYear}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{t('overallAverage')}</p>
                <p className="text-xl font-semibold">{reportCard.data.overallAverage}</p>
              </div>
            </CardContent>
          </Card>

          {reportCard.data.subjects.length === 0 ? (
            <EmptyState message={t('empty')} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>{t('subject')}</TableHead>
                    <TableHead>{t('average')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportCard.data.subjects.map((subject) => {
                    const isOpen = expanded.has(subject.subjectId);
                    return (
                      <FragmentRow
                        key={subject.subjectId}
                        isOpen={isOpen}
                        onToggle={() => toggleRow(subject.subjectId)}
                        subject={subject}
                        statusBadge={statusBadge(subject)}
                        labels={{
                          noGrades: t('noGrades'),
                          evaluation: t('evaluationTitle'),
                          type: t('type'),
                          grade: t('grade'),
                          absent: t('absent'),
                          empty: t('noSubjectEvaluations'),
                        }}
                        formatType={tType}
                        formatConcept={tConcept}
                      />
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface FragmentRowProps {
  isOpen: boolean;
  onToggle: () => void;
  subject: ReportCard['subjects'][number];
  statusBadge: React.ReactNode;
  labels: {
    noGrades: string;
    evaluation: string;
    type: string;
    grade: string;
    absent: string;
    empty: string;
  };
  formatType: (key: string) => string;
  formatConcept: (key: string) => string;
}

/** A subject row plus its expandable per-evaluation drilldown. */
function FragmentRow({
  isOpen,
  onToggle,
  subject,
  statusBadge,
  labels,
  formatType,
  formatConcept,
}: FragmentRowProps) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          {isOpen ? (
            <ChevronDown className="text-muted-foreground size-4" />
          ) : (
            <ChevronRight className="text-muted-foreground size-4" />
          )}
        </TableCell>
        <TableCell className="font-medium">{subject.name}</TableCell>
        <TableCell>{subject.hasGrades ? subject.average : labels.noGrades}</TableCell>
        <TableCell>{statusBadge}</TableCell>
      </TableRow>
      {isOpen ? (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={4} className="bg-muted/40 p-0">
            {subject.evaluations.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">{labels.empty}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.evaluation}</TableHead>
                    <TableHead>{labels.type}</TableHead>
                    <TableHead className="text-right">{labels.grade}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subject.evaluations.map((evaluation) => (
                    <TableRow key={evaluation.id} className="hover:bg-transparent">
                      <TableCell>{evaluation.title}</TableCell>
                      <TableCell>{formatType(evaluation.type)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {evaluation.wasAbsent
                          ? labels.absent
                          : evaluation.conceptualValue
                            ? formatConcept(evaluation.conceptualValue)
                            : (evaluation.numericValue ?? '-')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}
