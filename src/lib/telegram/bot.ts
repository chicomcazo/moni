import { Bot, InlineKeyboard } from "grammy";

let _bot: Bot | null = null;

export function getBot(): Bot {
  if (!_bot) {
    _bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
    registerHandlers(_bot);
  }
  return _bot;
}

function registerHandlers(bot: Bot) {
  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Olá! Manda uma foto da nota fiscal que eu extraio os itens pra você 🧾",
    );
  });

  // Handle retry button callback
  bot.callbackQuery(/^retry:(.+)$/, async (ctx) => {
    const fileId = ctx.match[1];
    await ctx.answerCallbackQuery({ text: "Reprocessando..." });
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
    await processPhoto(ctx, fileId);
  });

  bot.on("message:photo", async (ctx) => {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const photoMessageId = ctx.message.message_id;
    await processPhoto(ctx, photo.file_id, photoMessageId);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processPhoto(ctx: any, fileId: string, photoMessageId?: number) {
  const chatId = ctx.chat?.id ?? ctx.callbackQuery?.message?.chat?.id;
  // For retry callbacks, the photo message is the one being replied to
  const replyTo =
    photoMessageId ??
    ctx.callbackQuery?.message?.reply_to_message?.message_id;

  const replyParams = replyTo
    ? { reply_parameters: { message_id: replyTo } }
    : {};

  await ctx.reply("Recebi a nota! Processando...", replyParams);

  try {
    const file = await ctx.api.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    const { processReceipt } = await import("@/lib/pipeline/process-receipt");
    const result = await processReceipt(fileUrl, chatId, replyTo ?? 0);

    const lines = result.items.map(
      (item) =>
        `• ${item.normalized_name} — R$ ${item.total_price.toFixed(2)}`,
    );
    const summary = [
      result.store_name ? `🏪 ${result.store_name}` : "🧾 Nota processada",
      result.receipt_date ? `📅 ${result.receipt_date}` : "",
      "",
      ...lines,
      "",
      `💰 Total: R$ ${result.items_total.toFixed(2)}`,
      `📦 ${result.items.length} itens extraídos`,
    ]
      .filter(Boolean)
      .join("\n");

    await ctx.reply(summary, replyParams);
  } catch (err) {
    console.error("Error processing receipt:", err);

    const retryKeyboard = new InlineKeyboard().text(
      "🔄 Tentar novamente",
      `retry:${fileId}`,
    );

    await ctx.reply(
      "Erro ao processar a nota. Tente novamente ou mande uma foto mais nítida.",
      { ...replyParams, reply_markup: retryKeyboard },
    );
  }
}
