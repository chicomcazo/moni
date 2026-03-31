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
  const uncached: string[] = [];
  const cached = new Map<
    string,
    { normalized_name: string; category: string }
  >();

  // Phase 1: Check cache
  for (const item of items) {
    const pattern = item.raw_name.toUpperCase().trim();
    const { data } = await supabase
      .from("category_mappings")
      .select("normalized_name, categories(name)")
      .eq("raw_name_pattern", pattern)
      .single();

    if (data) {
      const categories = data.categories as unknown as { name: string };
      cached.set(item.raw_name, {
        normalized_name: data.normalized_name,
        category: categories.name,
      });
    } else {
      uncached.push(item.raw_name);
    }
  }

  // Phase 2: Call OpenAI for uncached items only
  let newMappings: CategorizedItem[] = [];

  if (uncached.length > 0) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Você categoriza itens de notas fiscais brasileiras de supermercado/loja.
Para cada item, forneça:
- normalized_name: nome limpo em português (ex: "PAO FRANCES 500G" -> "Pão Francês")
- category: categoria específica do item (ex: "Pão", "Carne Bovina", "Leite", "Cerveja", "Arroz")

NÃO use categorias genéricas como "Mercado" ou "Padaria".
Use categorias específicas que descrevam O QUE o item É.
Retorne um objeto JSON com a chave "items" contendo o array.`,
        },
        {
          role: "user",
          content: JSON.stringify(uncached),
        },
      ],
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0].message.content!) as {
      items: { raw_name: string; normalized_name: string; category: string }[];
    };
    newMappings = parsed.items;

    // Phase 3: Cache new mappings
    for (const mapping of newMappings) {
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
    const fromCache = cached.get(item.raw_name);
    if (fromCache) {
      return { raw_name: item.raw_name, ...fromCache };
    }
    const fromNew = newMappings.find((m) => m.raw_name === item.raw_name);
    if (fromNew) return fromNew;
    // Fallback: return raw name as-is
    return {
      raw_name: item.raw_name,
      normalized_name: item.raw_name,
      category: "Outros",
    };
  });
}
