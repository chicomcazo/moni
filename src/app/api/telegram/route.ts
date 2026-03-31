import { NextResponse } from "next/server";

export const maxDuration = 60;

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(
  chatId: number,
  text: string,
  options?: { reply_to_message_id?: number; reply_markup?: unknown },
) {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (options?.reply_to_message_id) {
    body.reply_parameters = { message_id: options.reply_to_message_id };
  }
  if (options?.reply_markup) {
    body.reply_markup = options.reply_markup;
  }
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function getFileUrl(fileId: string): Promise<string> {
  const res = await fetch(`${TELEGRAM_API}/getFile?file_id=${fileId}`);
  const data = await res.json();
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${data.result.file_path}`;
}

export async function POST(req: Request) {
  try {
    const update = await req.json();

    // Handle callback queries (retry button)
    if (update.callback_query) {
      const cb = update.callback_query;
      const match = cb.data?.match(/^retry:(.+)$/);
      if (match) {
        const fileId = match[1];
        const chatId = cb.message?.chat?.id;
        const photoMsgId =
          cb.message?.reply_to_message?.message_id;

        // Acknowledge callback
        await fetch(
          `${TELEGRAM_API}/answerCallbackQuery?callback_query_id=${cb.id}&text=Reprocessando...`,
        );

        // Remove retry button
        await fetch(`${TELEGRAM_API}/editMessageReplyMarkup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: cb.message?.message_id,
          }),
        });

        if (chatId) {
          await handlePhoto(chatId, fileId, photoMsgId);
        }
      }
      return NextResponse.json({ ok: true });
    }

    const message = update.message;
    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;

    // /start command
    if (message.text?.startsWith("/start")) {
      await sendMessage(
        chatId,
        "Olá! Manda uma foto da nota fiscal que eu extraio os itens pra você 🧾",
      );
      return NextResponse.json({ ok: true });
    }

    // Photo message
    if (message.photo && message.photo.length > 0) {
      const photo = message.photo[message.photo.length - 1];
      await handlePhoto(chatId, photo.file_id, message.message_id);
      return NextResponse.json({ ok: true });
    }

    // Anything else — ignore silently
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Telegram webhook top-level error:", err);
    // Always return 200 so Telegram doesn't retry
    return NextResponse.json({ ok: true });
  }
}

async function handlePhoto(
  chatId: number,
  fileId: string,
  photoMessageId?: number,
) {
  const replyOpts = photoMessageId
    ? { reply_to_message_id: photoMessageId }
    : {};

  await sendMessage(chatId, "Recebi a nota! Processando...", replyOpts);

  try {
    const fileUrl = await getFileUrl(fileId);

    const { processReceipt } = await import("@/lib/pipeline/process-receipt");
    const result = await processReceipt(fileUrl, chatId, photoMessageId ?? 0);

    if (result.duplicate) {
      await sendMessage(
        chatId,
        "⚠️ Nota fiscal já registrada! Essa nota já foi processada anteriormente.",
        replyOpts,
      );
      return;
    }

    const lines = result.items.map(
      (item) =>
        `• ${item.normalized_name} — R$ ${item.total_price.toFixed(2)}`,
    );
    const dateTime = [result.receipt_date, result.receipt_time]
      .filter(Boolean)
      .join(" ");
    const summary = [
      result.store_name ? `🏪 ${result.store_name}` : "🧾 Nota processada",
      result.cnpj ? `🏢 CNPJ: ${result.cnpj}` : "",
      dateTime ? `📅 ${dateTime}` : "",
      "",
      ...lines,
      "",
      `💰 Total: R$ ${result.items_total.toFixed(2)}`,
      `📦 ${result.items.length} itens extraídos`,
    ]
      .filter(Boolean)
      .join("\n");

    await sendMessage(chatId, summary, replyOpts);
  } catch (err) {
    console.error("Error processing receipt:", err);

    const errorMessage =
      err instanceof Error ? err.message : "Erro desconhecido";

    await sendMessage(
      chatId,
      `Erro ao processar a nota: ${errorMessage}`,
      {
        ...replyOpts,
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Tentar novamente", callback_data: `retry:${fileId}` }],
          ],
        },
      },
    );
  }
}
