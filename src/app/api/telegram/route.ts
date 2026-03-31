import { webhookCallback } from "grammy/web";
import { getBot } from "@/lib/telegram/bot";

export const POST = async (req: Request) => {
  try {
    const bot = getBot();
    const handler = webhookCallback(bot, "std/http");
    return handler(req);
  } catch (err) {
    console.error("Telegram webhook error:", err);
    // Always return 200 to prevent Telegram from retrying
    return new Response("OK", { status: 200 });
  }
};
