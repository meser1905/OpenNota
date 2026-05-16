'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { SubjectWithClassGroup } from '@/lib/api/types';
import { useApiClient } from '@/lib/api/use-api-client';

/**
 * Dashboard card listing a teacher's subjects, each linking to the grade
 * entry sheet. Rendered only for the TEACHER role.
 */
export function TeacherSubjectsCard() {
  const t = useTranslations('dashboard');
  const api = useApiClient();

  const subjects = useQuery({
    queryKey: ['subjects', 'mine'],
    queryFn: () => api.get<SubjectWithClassGroup[]>('/subjects/mine'),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('teacherSubjects')}</CardTitle>
      </CardHeader>
      <CardContent>
        {subjects.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : subjects.isError ? (
          <p className="text-muted-foreground text-sm">{t('teacherSubjectsEmpty')}</p>
        ) : subjects.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('teacherSubjectsEmpty')}</p>
        ) : (
          <ul className="divide-y">
            {subjects.data.map((subject) => (
              <li key={subject.id}>
                <Link
                  href="/grades"
                  className="hover:bg-accent flex items-center justify-between rounded-md px-2 py-2.5"
                >
                  <span className="flex items-center gap-3">
                    <BookOpen className="text-muted-foreground size-4" />
                    <span>
                      <span className="font-medium">{subject.name}</span>
                      <span className="text-muted-foreground block text-xs">
                        {subject.classGroup.name}
                      </span>
                    </span>
                  </span>
                  <ChevronRight className="text-muted-foreground size-4" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
