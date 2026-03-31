import { Mistral } from "@mistralai/mistralai";
import OpenAI from "openai";

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export interface OcrItem {
  raw_name: string;
  product_code: string | null;
  quantity: number;
  unit_price: number;
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

export async function extractReceiptData(
  imageUrl: string,
): Promise<OcrResult> {
  const base64 = await imageUrlToBase64(imageUrl);
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  // Step 1: OCR with Mistral dedicated endpoint (fast, no vision rate limit)
  const ocrResponse = await mistral.ocr.process({
    model: "mistral-ocr-latest",
    document: {
      type: "image_url",
      imageUrl: dataUrl,
    },
  });

  const rawText = ocrResponse.pages
    ?.map((page) => page.markdown)
    .join("\n") ?? "";

  if (!rawText) {
    throw new Error("OCR returned empty text");
  }

  // Step 2: Structure the raw text with GPT-4o-mini (fast, cheap)
  const structureResponse = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Você recebe o texto OCR de uma nota fiscal brasileira e deve extrair os dados em JSON estruturado.
Retorne APENAS JSON válido com esta estrutura:
{
  "store_name": "nome da loja ou null",
  "cnpj": "XX.XXX.XXX/XXXX-XX ou null",
  "ie": "inscrição estadual ou null",
  "receipt_date": "DD/MM/YYYY ou null",
  "receipt_time": "HH:MM:SS ou HH:MM ou null",
  "total_amount": 123.45,
  "items": [
    {
      "raw_name": "texto exato do item",
      "product_code": "código do produto ou null",
      "quantity": 1,
      "unit_price": 3.50,
      "total_price": 3.50
    }
  ]
}`,
      },
      {
        role: "user",
        content: rawText,
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = structureResponse.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to structure OCR data");
  }

  const parsed = JSON.parse(content) as Omit<OcrResult, "raw_text">;
  return { ...parsed, raw_text: rawText };
}
