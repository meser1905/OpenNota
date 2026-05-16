import { z } from 'zod';

/** Lenient identifier schema. Referential integrity is enforced by the database. */
export const idSchema = z.string().min(1, 'An identifier is required');

/** Accepts an ISO date string or a Date and yields a Date. */
export const isoDateSchema = z.coerce.date();

export const sortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof sortOrderSchema>;

/** Standard pagination query, with coercion for string query parameters. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Builds the schema of a paginated response envelope for a given item schema. */
export function paginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalPages: z.number().int().nonnegative(),
  });
}
