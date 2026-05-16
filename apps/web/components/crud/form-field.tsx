'use client';

import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';

interface FormFieldProps {
  /** Field id, wired to the control's `id` and the label's `htmlFor`. */
  id: string;
  label: string;
  /** Validation error message, when present. */
  error?: string;
  children: ReactNode;
}

/** A labelled form control with an error slot, matching the login form's style. */
export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  );
}
