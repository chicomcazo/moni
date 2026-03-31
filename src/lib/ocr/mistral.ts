import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! });

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
            text: `Extraia todos os dados desta nota fiscal brasileira.
Retorne JSON com esta estrutura exata:
{
  "store_name": "nome da loja ou null",
  "cnpj": "XX.XXX.XXX/XXXX-XX ou null",
  "ie": "inscrição estadual ou null",
  "receipt_date": "DD/MM/YYYY ou null",
  "receipt_time": "HH:MM:SS ou HH:MM ou null",
  "total_amount": 123.45,
  "items": [
    {
      "raw_name": "texto exato do item na nota",
      "product_code": "código do produto na nota ou null",
      "quantity": 1,
      "unit_price": 3.50,
      "total_price": 3.50
    }
  ],
  "raw_text": "texto completo da nota"
}
- Extraia o CNPJ e IE exatamente como aparecem na nota.
- A data deve estar no formato brasileiro DD/MM/YYYY.
- O horário deve ser HH:MM:SS ou HH:MM (se segundos não aparecerem).
- O product_code é o código numérico que aparece junto ao item (COD, código do produto).
- Retorne APENAS JSON válido, sem markdown.`,
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
