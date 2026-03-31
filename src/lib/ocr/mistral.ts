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

export async function extractReceiptData(
  imageUrl: string,
): Promise<OcrResult> {
  const base64 = await imageUrlToBase64(imageUrl);
  const dataUrl = `data:image/jpeg;base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: dataUrl } },
          {
            type: "text",
            text: `Extraia todos os dados desta nota fiscal brasileira.

REGRAS IMPORTANTES:
- Leia os nomes com cuidado. Notas fiscais usam abreviações — interprete corretamente.
- Os NÚMEROS (preços, quantidades, total) devem ser EXATOS como na nota. Não arredonde.
- O CNPJ deve ser extraído exatamente como aparece.
- Data no formato DD/MM/YYYY, horário HH:MM:SS ou HH:MM.
- product_code é o código numérico do item na nota.

Retorne APENAS JSON válido:
{
  "store_name": "nome da loja ou null",
  "cnpj": "XX.XXX.XXX/XXXX-XX ou null",
  "ie": "inscrição estadual ou null",
  "receipt_date": "DD/MM/YYYY ou null",
  "receipt_time": "HH:MM:SS ou HH:MM ou null",
  "total_amount": 77.95,
  "items": [
    {
      "raw_name": "nome legível do item",
      "product_code": "código ou null",
      "quantity": 1,
      "unit_price": 3.50,
      "total_price": 3.50
    }
  ],
  "raw_text": "transcrição completa da nota"
}`,
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty response");
  }

  return JSON.parse(content) as OcrResult;
}
