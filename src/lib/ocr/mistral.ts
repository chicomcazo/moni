import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export interface OcrItem {
  raw_name: string;
  product_code: string | null;
  quantity: number;
  unit_price: number | null;
  total_price: number;
}

export interface OcrResult {
  store_name: string | null;
  cnpj: string | null;
  ie: string | null;
  receipt_date: string | null;
  receipt_time: string | null;
  total_amount: number | null;
  items: OcrItem[];
  raw_text: string;
}

async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

function parseReceiptText(rawText: string): Omit<OcrResult, "raw_text"> {
  const lines = rawText.split("\n").map((l) => l.trim());

  let store_name: string | null = null;
  let cnpj: string | null = null;
  let ie: string | null = null;
  let receipt_date: string | null = null;
  let receipt_time: string | null = null;
  let total_amount: number | null = null;

  for (const line of lines) {
    const cnpjMatch = line.match(
      /(?:CNPJ|CHFJ|CNPI|CNP)[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i,
    );
    if (cnpjMatch) {
      const digits = cnpjMatch[1].replace(/\D/g, "");
      if (digits.length === 14) {
        cnpj = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
      } else {
        cnpj = cnpjMatch[1];
      }
    }

    const ieMatch = line.match(/IE[:\s]*(\d[\d.]+)/i);
    if (ieMatch && !ie) ie = ieMatch[1];

    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch && !receipt_date) receipt_date = dateMatch[1];

    const timeMatch = line.match(/(\d{2}:\d{2}(?::\d{2})?)/);
    if (timeMatch && !receipt_time && receipt_date) receipt_time = timeMatch[1];

    const totalMatch = line.match(/TOTAL\s+R?\$?\s*([\d.,]+)/i);
    if (totalMatch) {
      const val = totalMatch[1];
      total_amount =
        val.includes(",") && !val.includes(".")
          ? parseFloat(val.replace(",", "."))
          : parseFloat(val);
    }

    if (
      !store_name &&
      line.match(/LTDA|SUPERMERCADO|MERCADO|PADARIA|LOJA|COMERCIO/i)
    ) {
      const cleaned = line.replace(/^(PDF|POP|REF)\s+/i, "").replace(/BOX\s+\d+.*$/i, "").trim();
      if (cleaned.length > 3) store_name = cleaned;
    }
  }

  // Parse items from markdown table
  const items: OcrItem[] = [];
  const tableRowRegex =
    /\|\s*\d+\s*\|\s*(\d+)\s*\|\s*(.+?)\s*\|\s*([\d.,]+)\s*\|\s*([\d.,]*)\s*\|/g;

  let match;
  while ((match = tableRowRegex.exec(rawText)) !== null) {
    const product_code = match[1];
    const description = match[2].trim();
    const col3 = match[3].trim();
    const col4 = match[4]?.trim();

    let quantity = 1;
    let unit_price: number | null = null;

    const qtyMatch = description.match(
      /([\d.]+)\s*(?:Kg|Un|kg|un)\s*X\s*([\d.]+)/i,
    );
    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1]);
      unit_price = parseFloat(qtyMatch[2]);
    }

    const total_price =
      col4 && col4.length > 0
        ? parseFloat(col4.replace(",", "."))
        : parseFloat(col3.replace(",", "."));

    if (isNaN(total_price)) continue;

    const rawName = description
      .replace(/\s*[\d.]+\s*(?:Kg|Un|kg|un)\s*X\s*[\d.]+/i, "")
      .replace(/\s+/g, " ")
      .trim();

    items.push({
      raw_name: rawName || description,
      product_code,
      quantity,
      unit_price,
      total_price,
    });
  }

  // Fallback line-by-line parsing
  if (items.length === 0) {
    for (const line of lines) {
      const itemMatch = line.match(/\d{3}\s+(\d+)\s+(.+?)\s+([\d.]+)\s*$/);
      if (itemMatch) {
        items.push({
          raw_name: itemMatch[2].trim(),
          product_code: itemMatch[1],
          quantity: 1,
          unit_price: null,
          total_price: parseFloat(itemMatch[3]),
        });
      }
    }
  }

  return { store_name, cnpj, ie, receipt_date, receipt_time, total_amount, items };
}

async function fixItemNames(
  items: { raw_name: string; product_code: string | null }[],
): Promise<string[]> {
  if (items.length === 0) return [];

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Você recebe nomes de itens de uma nota fiscal brasileira extraídos por OCR.
O OCR frequentemente erra letras — corrija os nomes para o produto real mais provável.
Exemplos: "OVD JUNB GRENCO" → "OVO JUMBO BRANCO", "ERWILN LONG" → "ERVILHA LONGA", "BATA DOCE" → "BATATA DOCE".
Mantenha o nome curto e direto, como apareceria num supermercado.
Retorne um JSON com a chave "names" contendo um array de strings corrigidas, na mesma ordem.`,
      },
      {
        role: "user",
        content: JSON.stringify(items.map((i) => i.raw_name)),
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) return items.map((i) => i.raw_name);

  const parsed = JSON.parse(content) as { names: string[] };
  return parsed.names ?? items.map((i) => i.raw_name);
}

export async function extractReceiptData(
  imageUrl: string,
): Promise<OcrResult> {
  const base64 = await imageUrlToBase64(imageUrl);
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  // Step 1: Mistral OCR via direct API call (SDK has issues on Vercel)
  const ocrRes = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: {
        type: "image_url",
        image_url: dataUrl,
      },
    }),
  });

  if (!ocrRes.ok) {
    const errBody = await ocrRes.text();
    throw new Error(`Mistral OCR failed (${ocrRes.status}): ${errBody.slice(0, 200)}`);
  }

  const ocrData = (await ocrRes.json()) as {
    pages?: { markdown: string }[];
  };
  const rawText =
    ocrData.pages?.map((page) => page.markdown).join("\n") ?? "";

  if (!rawText) {
    throw new Error("OCR returned empty text");
  }

  // Step 2: Parse structured data from OCR text (no API, instant)
  const parsed = parseReceiptText(rawText);

  // Step 3: Fix OCR name errors with GPT-4o-mini (fast, cheap)
  if (parsed.items.length > 0) {
    const fixedNames = await fixItemNames(parsed.items);
    for (let i = 0; i < parsed.items.length; i++) {
      if (fixedNames[i]) {
        parsed.items[i].raw_name = fixedNames[i];
      }
    }
  }

  return { ...parsed, raw_text: rawText };
}
