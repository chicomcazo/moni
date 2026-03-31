import { z } from "zod/v4";

export const itemSchema = z.object({
  id: z.string().uuid(),
  receipt_id: z.string().uuid(),
  category_id: z.string().uuid().nullable(),
  raw_name: z.string().min(1),
  normalized_name: z.string().min(1),
  product_code: z.string().nullable(),
  quantity: z.number().positive(),
  unit_price: z.number().nonnegative().nullable(),
  total_price: z.number().nonnegative(),
  created_at: z.string().datetime(),
});

export type Item = z.infer<typeof itemSchema>;
