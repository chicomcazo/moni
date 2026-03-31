import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });


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

  // Extract store name (usually one of the first non-empty lines after header)
  let store_name: string | null = null;
  let cnpj: string | null = null;
  let ie: string | null = null;
  let receipt_date: string | null = null;
  let receipt_time: string | null = null;
  let total_amount: number | null = null;

  for (const line of lines) {
    // CNPJ: XX.XXX.XXX/XXXX-XX or CNPJ:XXXXXXXXXX (OCR sometimes reads CNPJ as CHFJ, CNPI, etc)
    const cnpjMatch = line.match(
      /(?:CNPJ|CHFJ|CNPI|CNP)[:\s]*(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i,
    );
    if (cnpjMatch) {
      // Format as XX.XXX.XXX/XXXX-XX
      const digits = cnpjMatch[1].replace(/\D/g, "");
      if (digits.length === 14) {
        cnpj = `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
      } else {
        cnpj = cnpjMatch[1];
      }
    }

    // IE
    const ieMatch = line.match(/IE[:\s]*(\d[\d.]+)/i);
    if (ieMatch) {
      ie = ieMatch[1];
    }

    // Date: DD/MM/YYYY
    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (dateMatch && !receipt_date) {
      receipt_date = dateMatch[1];
    }

    // Time: HH:MM:SS or HH:MM
    const timeMatch = line.match(/(\d{2}:\d{2}(?::\d{2})?)/);
    if (timeMatch && !receipt_time && receipt_date) {
      receipt_time = timeMatch[1];
    }

    // Total
    const totalMatch = line.match(
      /TOTAL\s+R?\$?\s*([\d.,]+)/i,
    );
    if (totalMatch) {
      total_amount = parseFloat(
        totalMatch[1].replace(".", "").replace(",", "."),
      );
      // Handle case where it's already a decimal like 77.95
      if (totalMatch[1].includes(".") && !totalMatch[1].includes(",")) {
        total_amount = parseFloat(totalMatch[1]);
      }
    }

    // Store name: look for LTDA, SUPERMERCADO, etc.
    if (
      !store_name &&
      (line.match(/LTDA|SUPERMERCADO|MERCADO|PADARIA|LOJA|COMERCIO/i) ||
        line.match(/^[A-Z\s]{5,}$/))
    ) {
      // Clean up the store name
      const cleaned = line
        .replace(/^(PDF|POP|REF)\s+/i, "")
        .replace(/BOX\s+\d+.*$/i, "")
        .trim();
      if (cleaned.length > 3) {
        store_name = cleaned;
      }
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

    // Parse quantity, unit price and total price from description
    let quantity = 1;
    let unit_price: number | null = null;
    let total_price: number;

    // Try to extract quantity from description like "0.260 Kg X 10.99"
    const qtyMatch = description.match(
      /([\d.]+)\s*(?:Kg|Un|kg|un)\s*X\s*([\d.]+)/i,
    );
    if (qtyMatch) {
      quantity = parseFloat(qtyMatch[1]);
      unit_price = parseFloat(qtyMatch[2]);
    }

    // The last numeric column is typically total_price
    if (col4 && col4.length > 0) {
      total_price = parseFloat(col4.replace(",", "."));
    } else {
      total_price = parseFloat(col3.replace(",", "."));
    }

    if (isNaN(total_price)) continue;

    // Extract just the item name from description (remove qty/price info)
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

  // If table parsing didn't work, try line-by-line parsing
  if (items.length === 0) {
    for (const line of lines) {
      // Match patterns like: 001 243210 SACOLA VERD.VALGRION 1 Un X 0.12 0.12
      const itemMatch = line.match(
        /\d{3}\s+(\d+)\s+(.+?)\s+([\d.]+)\s*$/,
      );
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

  return {
    store_name,
    cnpj,
    ie,
    receipt_date,
    receipt_time,
    total_amount,
    items,
  };
}

export async function extractReceiptData(
  imageUrl: string,
): Promise<OcrResult> {
  const base64 = await imageUrlToBase64(imageUrl);
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  // OCR with Mistral dedicated endpoint
  const ocrResponse = await mistral.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "image_url",
      imageUrl: dataUrl,
    },
  });

  const rawText =
    ocrResponse.pages?.map((page) => page.markdown).join("\n") ?? "";

  if (!rawText) {
    throw new Error("OCR returned empty text");
  }

  // Parse the raw text directly — no GPT, no name changes
  const parsed = parseReceiptText(rawText);

  return { ...parsed, raw_text: rawText };
}
