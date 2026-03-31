import { extractReceiptData } from "@/lib/ocr/mistral";
import { categorizeItems } from "@/lib/categorization/openai";
import { supabase } from "@/lib/supabase/client";

export interface ProcessedReceipt {
  receipt_id: string;
  store_name: string | null;
  cnpj: string | null;
  receipt_date: string | null;
  receipt_time: string | null;
  items_total: number;
  duplicate: boolean;
  items: {
    raw_name: string;
    normalized_name: string;
    category: string;
    product_code: string | null;
    quantity: number;
    unit_price: number | null;
    total_price: number;
  }[];
}

/** Convert DD/MM/YYYY to YYYY-MM-DD for Postgres DATE column */
function toIsoDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  return dateStr; // already ISO or unknown format
}

async function checkDuplicate(
  cnpj: string | null,
  receiptDate: string | null,
  receiptTime: string | null,
  totalAmount: number | null,
): Promise<string | null> {
  // Need at least date + one more identifier
  if (!receiptDate) return null;

  let query = supabase
    .from("receipts")
    .select("id")
    .eq("status", "completed")
    .eq("receipt_date", receiptDate);

  if (cnpj) {
    query = query.eq("cnpj", cnpj);
  }
  if (receiptTime) {
    query = query.eq("receipt_time", receiptTime);
  }
  if (totalAmount != null) {
    query = query.eq("total_amount", totalAmount);
  }

  const { data } = await query.limit(1).single();
  return data?.id ?? null;
}

export async function processReceipt(
  imageUrl: string,
  chatId: number,
  messageId: number,
): Promise<ProcessedReceipt> {
  // 1. Extract items via OCR first (before creating DB record)
  const ocrResult = await extractReceiptData(imageUrl);

  // Filter valid items from OCR
  const validOcrItems = ocrResult.items.filter(
    (item) => item.raw_name && item.total_price != null,
  );

  if (validOcrItems.length === 0) {
    throw new Error("Nenhum item encontrado na nota fiscal");
  }

  // 2. Check for duplicates
  const isoDate = toIsoDate(ocrResult.receipt_date);
  const duplicateId = await checkDuplicate(
    ocrResult.cnpj,
    isoDate,
    ocrResult.receipt_time,
    ocrResult.total_amount,
  );

  if (duplicateId) {
    // Fetch existing receipt data to return
    const { data: existingItems } = await supabase
      .from("items")
      .select("raw_name, normalized_name, product_code, quantity, unit_price, total_price, categories(name)")
      .eq("receipt_id", duplicateId);

    const itemsTotal = validOcrItems.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );

    return {
      receipt_id: duplicateId,
      store_name: ocrResult.store_name,
      cnpj: ocrResult.cnpj,
      receipt_date: ocrResult.receipt_date,
      receipt_time: ocrResult.receipt_time,
      items_total: itemsTotal,
      duplicate: true,
      items: (existingItems ?? []).map((item) => ({
        raw_name: item.raw_name,
        normalized_name: item.normalized_name,
        category: (item.categories as unknown as { name: string })?.name ?? "Outros",
        product_code: item.product_code,
        quantity: Number(item.quantity),
        unit_price: item.unit_price ? Number(item.unit_price) : null,
        total_price: Number(item.total_price),
      })),
    };
  }

  // 3. Create receipt record
  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .insert({
      telegram_chat_id: chatId,
      telegram_message_id: messageId,
      image_url: imageUrl,
      status: "processing",
    })
    .select("id")
    .single();

  if (receiptError || !receipt) {
    throw new Error(`Failed to create receipt: ${receiptError?.message}`);
  }

  try {
    // 4. Categorize items
    const categorized = await categorizeItems(
      validOcrItems.map((item) => ({ raw_name: item.raw_name })),
    );

    // 5. Resolve category IDs in parallel
    const uniqueCategories = [...new Set(categorized.map((c) => c.category))];
    const categoryIdMap = new Map<string, string>();

    await Promise.all(
      uniqueCategories.map(async (name) => {
        const { data } = await supabase
          .from("categories")
          .upsert({ name }, { onConflict: "name" })
          .select("id")
          .single();
        if (data) categoryIdMap.set(name, data.id);
      }),
    );

    // 6. Save items to database
    const itemsToInsert = validOcrItems.map((ocrItem, index) => ({
      receipt_id: receipt.id,
      raw_name: ocrItem.raw_name,
      normalized_name: categorized[index].normalized_name,
      product_code: ocrItem.product_code ?? null,
      quantity: ocrItem.quantity ?? 1,
      unit_price: ocrItem.unit_price ?? null,
      total_price: ocrItem.total_price,
      category_id: categoryIdMap.get(categorized[index].category) ?? null,
    }));

    const { error: itemsError } = await supabase
      .from("items")
      .insert(itemsToInsert);

    if (itemsError) {
      throw new Error(`Failed to save items: ${itemsError.message}`);
    }

    // 7. Update receipt with extracted data
    const itemsTotal = validOcrItems.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );

    await supabase
      .from("receipts")
      .update({
        store_name: ocrResult.store_name,
        cnpj: ocrResult.cnpj,
        ie: ocrResult.ie,
        receipt_date: isoDate,
        receipt_time: ocrResult.receipt_time,
        total_amount: ocrResult.total_amount,
        items_total: itemsTotal,
        raw_ocr_text: ocrResult.raw_text,
        status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", receipt.id);

    return {
      receipt_id: receipt.id,
      store_name: ocrResult.store_name,
      cnpj: ocrResult.cnpj,
      receipt_date: ocrResult.receipt_date,
      receipt_time: ocrResult.receipt_time,
      items_total: itemsTotal,
      duplicate: false,
      items: validOcrItems.map((ocrItem, index) => ({
        raw_name: ocrItem.raw_name,
        normalized_name: categorized[index].normalized_name,
        category: categorized[index].category,
        product_code: ocrItem.product_code ?? null,
        quantity: ocrItem.quantity,
        unit_price: ocrItem.unit_price,
        total_price: ocrItem.total_price,
      })),
    };
  } catch (err) {
    // Mark receipt as failed
    await supabase
      .from("receipts")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", receipt.id);

    throw err;
  }
}
