import OpenAI from "openai";
import { supabase } from "@/lib/supabase/client";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export interface CategorizedItem {
  raw_name: string;
  normalized_name: string;
  category: string;
}

export async function categorizeItems(
  items: { raw_name: string }[],
): Promise<CategorizedItem[]> {
  // Filter out invalid items
  const validItems = items.filter(
    (item) => item.raw_name && typeof item.raw_name === "string",
  );

  if (validItems.length === 0) {
    return items.map((item) => ({
      raw_name: item.raw_name ?? "",
      normalized_name: item.raw_name ?? "",
      category: "Outros",
    }));
  }

  // Check cache in batch
  const patterns = validItems.map((item) =>
    item.raw_name.toUpperCase().trim(),
  );
  const { data: cachedMappings } = await supabase
    .from("category_mappings")
    .select("raw_name_pattern, normalized_name, categories(name)")
    .in("raw_name_pattern", patterns);

  const cacheMap = new Map<
    string,
    { normalized_name: string; category: string }
  >();
  for (const mapping of cachedMappings ?? []) {
    const categories = mapping.categories as unknown as { name: string };
    cacheMap.set(mapping.raw_name_pattern, {
      normalized_name: mapping.normalized_name,
      category: categories.name,
    });
  }

  const uncached = validItems.filter(
    (item) => !cacheMap.has(item.raw_name.toUpperCase().trim()),
  );

  // Call OpenAI for uncached items only (single batch call)
  let newMappings: CategorizedItem[] = [];

  if (uncached.length > 0) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você categoriza itens de notas fiscais brasileiras de supermercado/loja.
Para cada item, forneça:
- raw_name: o nome exato como recebido
- normalized_name: nome limpo em português (ex: "PAO FRANCES 500G" -> "Pão Francês")
- category: categoria específica do item (ex: "Pão", "Carne Bovina", "Leite", "Cerveja", "Arroz")

NÃO use categorias genéricas como "Mercado" ou "Padaria".
Use categorias específicas que descrevam O QUE o item É.
Retorne um objeto JSON com a chave "items" contendo o array.`,
        },
        {
          role: "user",
          content: JSON.stringify(uncached.map((i) => i.raw_name)),
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content!) as {
      items: CategorizedItem[];
    };
    newMappings = parsed.items ?? [];

    // Cache new mappings in batch
    for (const mapping of newMappings) {
      if (!mapping.raw_name || !mapping.category) continue;

      const { data: category } = await supabase
        .from("categories")
        .upsert({ name: mapping.category }, { onConflict: "name" })
        .select("id")
        .single();

      if (category) {
        await supabase.from("category_mappings").upsert(
          {
            raw_name_pattern: mapping.raw_name.toUpperCase().trim(),
            category_id: category.id,
            normalized_name: mapping.normalized_name,
          },
          { onConflict: "raw_name_pattern" },
        );
      }
    }
  }

  // Merge results
  return items.map((item) => {
    const rawName = item.raw_name ?? "";
    const pattern = rawName.toUpperCase().trim();

    const fromCache = cacheMap.get(pattern);
    if (fromCache) {
      return { raw_name: rawName, ...fromCache };
    }

    const fromNew = newMappings.find(
      (m) => m.raw_name?.toUpperCase().trim() === pattern,
    );
    if (fromNew) return fromNew;

    return {
      raw_name: rawName,
      normalized_name: rawName,
      category: "Outros",
    };
  });
}
