import { z } from "zod/v4";

export const receiptStatusSchema = z.enum([
  "processing",
  "completed",
  "failed",
]);

export const receiptSchema = z.object({
  id: z.string().uuid(),
  telegram_chat_id: z.number().int(),
  telegram_message_id: z.number().int().nullable(),
  store_name: z.string().nullable(),
  cnpj: z.string().nullable(),
  ie: z.string().nullable(),
  receipt_date: z.string().nullable(),
  receipt_time: z.string().nullable(),
  total_amount: z.number().nonnegative().nullable(),
  items_total: z.number().nonnegative().nullable(),
  image_url: z.string().url().nullable(),
  raw_ocr_text: z.string().nullable(),
  status: receiptStatusSchema,
  error_message: z.string().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const updateReceiptSchema = z.object({
  store_name: z.string().nullable().optional(),
  receipt_date: z.string().nullable().optional(),
  total_amount: z.number().nonnegative().nullable().optional(),
});

export type Receipt = z.infer<typeof receiptSchema>;
export type ReceiptStatus = z.infer<typeof receiptStatusSchema>;
