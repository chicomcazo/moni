import { Bot } from "grammy";

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

  bot.on("message:photo", async (ctx) => {
    await ctx.reply("Recebi a nota! Processando...");

    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    try {
      const { processReceipt } = await import(
        "@/lib/pipeline/process-receipt"
      );
      const result = await processReceipt(
        fileUrl,
        ctx.chat.id,
        ctx.message.message_id,
      );

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

      await ctx.reply(summary);
    } catch (err) {
      console.error("Error processing receipt:", err);
      await ctx.reply(
        "Erro ao processar a nota. Tente novamente com uma foto mais nítida.",
      );
    }
  });

  bot.on("message:text", async (ctx) => {
    await ctx.reply(
      "Manda uma foto da nota fiscal que eu processo pra você! 📸",
    );
  });
}
