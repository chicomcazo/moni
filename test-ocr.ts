import { extractReceiptData } from "./src/lib/ocr/mistral";

async function test() {
  const fileUrl = "https://api.telegram.org/file/bot8720780384:AAFqhQErTF4RaDdiVnP5ST2j6ZQuUjidLxo/photos/file_12.jpg";
  console.log("Testing GPT-4o-mini vision OCR...");
  const start = Date.now();
  const result = await extractReceiptData(fileUrl);
  console.log("Time:", Date.now() - start, "ms");
  console.log("Store:", result.store_name);
  console.log("CNPJ:", result.cnpj);
  console.log("Date:", result.receipt_date, result.receipt_time);
  console.log("Total:", result.total_amount);
  for (const item of result.items) {
    console.log(`  ${item.product_code ?? "?"} | ${item.raw_name} | qty:${item.quantity} | R$${item.total_price}`);
  }
}
test().catch((e) => console.error("ERROR:", e.message));
