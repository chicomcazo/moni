import { supabase } from "@/lib/supabase/client";

export async function correctCategory(params: {
  item_name: string;
  correct_category: string;
}) {
  // 1. Upsert the correct category
  const { data: category } = await supabase
    .from("categories")
    .upsert({ name: params.correct_category }, { onConflict: "name" })
    .select("id")
    .single();

  if (!category) {
    return { success: false, message: "Falha ao criar categoria" };
  }

  // 2. Find items matching the name
  const { data: items } = await supabase
    .from("items")
    .select("id, raw_name, normalized_name")
    .ilike("normalized_name", `%${params.item_name}%`);

  if (!items || items.length === 0) {
    return {
      success: false,
      message: `Nenhum item encontrado com nome "${params.item_name}"`,
    };
  }

  // 3. Update items to new category
  const itemIds = items.map((i) => i.id);
  await supabase
    .from("items")
    .update({ category_id: category.id })
    .in("id", itemIds);

  // 4. Update category_mappings cache for future receipts
  for (const item of items) {
    const pattern = item.raw_name.toUpperCase().trim();
    await supabase.from("category_mappings").upsert(
      {
        raw_name_pattern: pattern,
        category_id: category.id,
        normalized_name: item.normalized_name,
      },
      { onConflict: "raw_name_pattern" },
    );
  }

  return {
    success: true,
    message: `${items.length} item(s) "${params.item_name}" recategorizado(s) para "${params.correct_category}"`,
    updated_count: items.length,
  };
}

export async function getSpending(params: {
  category?: string;
  store?: string;
  start_date?: string;
  end_date?: string;
}) {
  // If filtering by category, first find matching category IDs
  let categoryIds: string[] | null = null;
  if (params.category) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id")
      .ilike("name", `%${params.category}%`);
    categoryIds = (cats ?? []).map((c) => c.id);
    if (categoryIds.length === 0) {
      return { total_spent: 0, item_count: 0, items: [] };
    }
  }

  let query = supabase
    .from("items")
    .select(
      "raw_name, normalized_name, quantity, unit_price, total_price, categories(name), receipts!inner(store_name, receipt_date, cnpj)",
    )
    .eq("receipts.status", "completed");

  if (categoryIds) {
    query = query.in("category_id", categoryIds);
  }
  if (params.store) {
    query = query.ilike("receipts.store_name", `%${params.store}%`);
  }
  if (params.start_date) {
    query = query.gte("receipts.receipt_date", params.start_date);
  }
  if (params.end_date) {
    query = query.lte("receipts.receipt_date", params.end_date);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Query failed: ${error.message}`);

  const items = data ?? [];
  const total = items.reduce((sum, i) => sum + Number(i.total_price), 0);

  return {
    total_spent: Math.round(total * 100) / 100,
    item_count: items.length,
    items: items.map((i) => ({
      name: i.normalized_name,
      category: (i.categories as unknown as { name: string })?.name ?? "Outros",
      store: (i.receipts as unknown as { store_name: string })?.store_name,
      date: (i.receipts as unknown as { receipt_date: string })?.receipt_date,
      quantity: Number(i.quantity),
      total_price: Number(i.total_price),
    })),
  };
}

export async function getTopCategories(params: {
  start_date?: string;
  end_date?: string;
  limit?: number;
}) {
  let query = supabase
    .from("items")
    .select(
      "total_price, categories(name), receipts!inner(receipt_date)",
    )
    .eq("receipts.status", "completed");

  if (params.start_date) {
    query = query.gte("receipts.receipt_date", params.start_date);
  }
  if (params.end_date) {
    query = query.lte("receipts.receipt_date", params.end_date);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Query failed: ${error.message}`);

  // Aggregate by category
  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const item of data ?? []) {
    const name =
      (item.categories as unknown as { name: string })?.name ?? "Outros";
    const existing = categoryMap.get(name) ?? { total: 0, count: 0 };
    existing.total += Number(item.total_price);
    existing.count += 1;
    categoryMap.set(name, existing);
  }

  const sorted = [...categoryMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, params.limit ?? 10);

  return {
    categories: sorted.map(([name, data]) => ({
      category: name,
      total_spent: Math.round(data.total * 100) / 100,
      item_count: data.count,
    })),
  };
}

export async function getReceipts(params: {
  store?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
}) {
  let query = supabase
    .from("receipts")
    .select("id, store_name, cnpj, receipt_date, receipt_time, total_amount, items_total")
    .eq("status", "completed")
    .order("receipt_date", { ascending: false });

  if (params.store) {
    query = query.ilike("store_name", `%${params.store}%`);
  }
  if (params.start_date) {
    query = query.gte("receipt_date", params.start_date);
  }
  if (params.end_date) {
    query = query.lte("receipt_date", params.end_date);
  }

  const { data, error } = await query.limit(params.limit ?? 20);
  if (error) throw new Error(`Query failed: ${error.message}`);

  return {
    receipts: (data ?? []).map((r) => ({
      store: r.store_name,
      cnpj: r.cnpj,
      date: r.receipt_date,
      time: r.receipt_time,
      total: r.total_amount ? Number(r.total_amount) : null,
    })),
  };
}

export async function getItemHistory(params: {
  item_name?: string;
  category?: string;
  limit?: number;
}) {
  let query = supabase
    .from("items")
    .select(
      "normalized_name, quantity, unit_price, total_price, product_code, categories(name), receipts!inner(store_name, receipt_date)",
    )
    .eq("receipts.status", "completed")
    .order("created_at", { ascending: false });

  if (params.item_name) {
    query = query.ilike("normalized_name", `%${params.item_name}%`);
  }
  if (params.category) {
    query = query.ilike("categories.name", `%${params.category}%`);
  }

  const { data, error } = await query.limit(params.limit ?? 30);
  if (error) throw new Error(`Query failed: ${error.message}`);

  return {
    items: (data ?? []).map((i) => ({
      name: i.normalized_name,
      category: (i.categories as unknown as { name: string })?.name ?? "Outros",
      store: (i.receipts as unknown as { store_name: string })?.store_name,
      date: (i.receipts as unknown as { receipt_date: string })?.receipt_date,
      quantity: Number(i.quantity),
      unit_price: i.unit_price ? Number(i.unit_price) : null,
      total_price: Number(i.total_price),
      product_code: i.product_code,
    })),
  };
}

export async function comparePeriods(params: {
  category?: string;
  period1_start: string;
  period1_end: string;
  period2_start: string;
  period2_end: string;
}) {
  const [p1, p2] = await Promise.all([
    getSpending({
      category: params.category,
      start_date: params.period1_start,
      end_date: params.period1_end,
    }),
    getSpending({
      category: params.category,
      start_date: params.period2_start,
      end_date: params.period2_end,
    }),
  ]);

  const diff = p1.total_spent - p2.total_spent;
  const pctChange =
    p2.total_spent > 0
      ? Math.round(((diff / p2.total_spent) * 100) * 100) / 100
      : null;

  return {
    period1: {
      range: `${params.period1_start} a ${params.period1_end}`,
      total_spent: Math.round(p1.total_spent * 100) / 100,
      item_count: p1.item_count,
    },
    period2: {
      range: `${params.period2_start} a ${params.period2_end}`,
      total_spent: Math.round(p2.total_spent * 100) / 100,
      item_count: p2.item_count,
    },
    difference: Math.round(diff * 100) / 100,
    percent_change: pctChange,
  };
}

export async function getSummary(params: {
  start_date?: string;
  end_date?: string;
}) {
  const [categories, receipts] = await Promise.all([
    getTopCategories({
      start_date: params.start_date,
      end_date: params.end_date,
      limit: 5,
    }),
    getReceipts({
      start_date: params.start_date,
      end_date: params.end_date,
    }),
  ]);

  const totalSpent = receipts.receipts.reduce(
    (sum, r) => sum + (r.total ?? 0),
    0,
  );

  return {
    total_spent: Math.round(totalSpent * 100) / 100,
    receipt_count: receipts.receipts.length,
    top_categories: categories.categories,
  };
}
