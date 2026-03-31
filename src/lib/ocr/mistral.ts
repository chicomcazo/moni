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

export async function extractReceiptData(
  imageUrl: string,
): Promise<OcrResult> {
  const response = await client.chat.complete({
    model: "pixtral-large-latest",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            imageUrl: imageUrl,
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
