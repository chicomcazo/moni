import { z } from "zod/v4";

export const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  parent_category: z.string().nullable(),
  created_at: z.string().datetime(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  parent_category: z.string().nullable().optional(),
});

export type Category = z.infer<typeof categorySchema>;
