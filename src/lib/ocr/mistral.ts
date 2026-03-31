import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

export interface OcrItem {
  raw_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface OcrResult {
  store_name: string | null;
  receipt_date: string | null;
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
  // Download image and convert to base64 (Telegram URLs require auth)
  const base64 = await imageUrlToBase64(imageUrl);
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const response = await client.chat.complete({
    model: "mistral-small-latest",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            imageUrl: dataUrl,
          },
          {
            type: "text",
            text: `Extraia todos os itens desta nota fiscal brasileira.
Retorne JSON com esta estrutura exata:
{
  "store_name": "nome da loja ou null",
  "receipt_date": "YYYY-MM-DD ou null",
  "total_amount": 123.45,
  "items": [
    {
      "raw_name": "texto exato da nota",
      "quantity": 1,
      "unit_price": 3.50,
      "total_price": 3.50
    }
  ],
  "raw_text": "texto completo da nota"
}
Retorne APENAS JSON válido, sem markdown.`,
          },
        ],
      },
    ],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("Mistral returned empty response");
  }

  return JSON.parse(content) as OcrResult;
}
