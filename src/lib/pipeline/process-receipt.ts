import { extractReceiptData } from "@/lib/ocr/mistral";
import { categorizeItems } from "@/lib/categorization/openai";
import { supabase } from "@/lib/supabase/client";

export interface ProcessedReceipt {
  receipt_id: string;
  store_name: string | null;
  receipt_date: string | null;
  items_total: number;
  items: {
    raw_name: string;
    normalized_name: string;
    category: string;
    quantity: number;
    unit_price: number | null;
    total_price: number;
  }[];
}

export async function processReceipt(
  imageUrl: string,
  chatId: number,
  messageId: number,
): Promise<ProcessedReceipt> {
  // 1. Create receipt record in "processing" status
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
    // 2. Extract items via OCR
    const ocrResult = await extractReceiptData(imageUrl);

    // Filter valid items from OCR
    const validOcrItems = ocrResult.items.filter(
      (item) => item.raw_name && item.total_price != null,
    );

    if (validOcrItems.length === 0) {
      throw new Error("Nenhum item encontrado na nota fiscal");
    }

    // 3. Categorize items
    const categorized = await categorizeItems(
      validOcrItems.map((item) => ({ raw_name: item.raw_name })),
    );

    // 4. Resolve category IDs in parallel
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

    // 5. Save items to database
    const itemsToInsert = validOcrItems.map((ocrItem, index) => ({
      receipt_id: receipt.id,
      raw_name: ocrItem.raw_name,
      normalized_name: categorized[index].normalized_name,
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

    // 6. Update receipt with extracted data
    const itemsTotal = validOcrItems.reduce(
      (sum, item) => sum + item.total_price,
      0,
    );

    await supabase
      .from("receipts")
      .update({
        store_name: ocrResult.store_name,
        receipt_date: ocrResult.receipt_date,
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
      receipt_date: ocrResult.receipt_date,
      items_total: itemsTotal,
      items: validOcrItems.map((ocrItem, index) => ({
        raw_name: ocrItem.raw_name,
        normalized_name: categorized[index].normalized_name,
        category: categorized[index].category,
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
