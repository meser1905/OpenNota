'use client';

import { useEffect, useRef, useState } from 'react';
import { CONCEPTUAL_GRADES, type ConceptualGrade, type UpsertGradeInput } from '@opennota/shared';
import { useMutation } from '@tanstack/react-query';
import { Check, CircleAlert, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api-client';
import type { GradeSheet } from '@/lib/api/types';
import type { ApiClient } from '@/lib/api/use-api-client';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/** Debounce window before an edited grade is persisted, in milliseconds. */
const SAVE_DEBOUNCE_MS = 600;
/** How long the "saved" confirmation lingers before fading to idle. */
const SAVED_LINGER_MS = 2000;

/** Sentinel `Select` value for a conceptual cell with no grade yet. */
const NONE = '__none__';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Evaluation = GradeSheet['evaluations'][number];
type Grade = GradeSheet['grades'][number];

interface GradeCellProps {
  api: ApiClient;
  evaluation: Evaluation;
  studentId: string;
  /** The grade already on file for this student/evaluation, if any. */
  initialGrade: Grade | undefined;
}

/**
 * One editable cell of the grade entry sheet. Owns its own value, debounces
 * keystrokes and persists via `POST /grades`, surfacing a per-cell save state.
 * It deliberately never reads from a shared query so a save elsewhere cannot
 * steal focus from a cell being edited.
 */
export function GradeCell({ api, evaluation, studentId, initialGrade }: GradeCellProps) {
  const t = useTranslations('grades');
  const isConceptual = evaluation.scale === 'CONCEPTUAL';

  const [numericValue, setNumericValue] = useState<string>(
    initialGrade?.numericValue != null ? String(initialGrade.numericValue) : '',
  );
  const [conceptualValue, setConceptualValue] = useState<ConceptualGrade | ''>(
    initialGrade?.conceptualValue ?? '',
  );
  const [wasAbsent, setWasAbsent] = useState<boolean>(initialGrade?.wasAbsent ?? false);
  const [saveState, setSaveState] = useState<SaveState>('idle');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mutation = useMutation({
    mutationFn: (body: UpsertGradeInput) => api.post('/grades', body),
    onMutate: () => {
      setSaveState('saving');
    },
    onSuccess: () => {
      setSaveState('saved');
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState('idle'), SAVED_LINGER_MS);
    },
    onError: () => {
      setSaveState('error');
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  /** Schedules a debounced save for the given cell state. */
  function scheduleSave(next: {
    numericValue: string;
    conceptualValue: ConceptualGrade | '';
    wasAbsent: boolean;
  }) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const parsedNumeric = next.numericValue.trim() === '' ? null : Number(next.numericValue);
      mutation.mutate({
        evaluationId: evaluation.id,
        studentId,
        wasAbsent: next.wasAbsent,
        numericValue: next.wasAbsent || isConceptual ? null : parsedNumeric,
        conceptualValue:
          next.wasAbsent || !isConceptual || next.conceptualValue === ''
            ? null
            : next.conceptualValue,
      });
    }, SAVE_DEBOUNCE_MS);
  }

  function handleNumericChange(value: string) {
    setNumericValue(value);
    scheduleSave({ numericValue: value, conceptualValue, wasAbsent });
  }

  function handleConceptualChange(value: string) {
    const next = value === NONE ? '' : (value as ConceptualGrade);
    setConceptualValue(next);
    scheduleSave({ numericValue, conceptualValue: next, wasAbsent });
  }

  function handleAbsentChange(value: boolean) {
    setWasAbsent(value);
    scheduleSave({ numericValue, conceptualValue, wasAbsent: value });
  }

  return (
    <div className="flex min-w-[8.5rem] items-center gap-2">
      {isConceptual ? (
        <Select
          value={conceptualValue === '' ? NONE : conceptualValue}
          onValueChange={handleConceptualChange}
          disabled={wasAbsent}
        >
          <SelectTrigger className="h-9 w-28" aria-label={t('gradeValue')}>
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>-</SelectItem>
            {CONCEPTUAL_GRADES.map((grade) => (
              <SelectItem key={grade} value={grade}>
                {t(`conceptual.${grade}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          type="number"
          inputMode="decimal"
          step="0.1"
          min={0}
          max={evaluation.maxScore}
          value={numericValue}
          disabled={wasAbsent}
          aria-label={t('gradeValue')}
          aria-invalid={saveState === 'error'}
          onChange={(event) => handleNumericChange(event.target.value)}
          className="h-9 w-20"
        />
      )}

      <Switch
        checked={wasAbsent}
        onCheckedChange={handleAbsentChange}
        aria-label={t('absent')}
        title={t('absent')}
      />

      <span className="flex w-4 justify-center" aria-live="polite">
        {saveState === 'saving' ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" aria-label={t('saving')} />
        ) : saveState === 'saved' ? (
          <Check className="text-success size-4" aria-label={t('savedCell')} />
        ) : saveState === 'error' ? (
          <CircleAlert
            className={cn('text-destructive size-4')}
            aria-label={
              mutation.error instanceof ApiError ? mutation.error.message : t('saveError')
            }
          />
        ) : null}
      </span>
    </div>
  );
}
