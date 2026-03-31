import { webhookCallback } from "grammy/web";
import { getBot } from "@/lib/telegram/bot";

export const POST = async (req: Request) => {
  const bot = getBot();
  const handler = webhookCallback(bot, "std/http");
  return handler(req);
};
