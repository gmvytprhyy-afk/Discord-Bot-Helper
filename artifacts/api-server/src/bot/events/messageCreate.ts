import { Events, type Message, type ChatInputCommandInteraction } from "discord.js";
import { logger } from "../../lib/logger";
import type { BotEvent, BotCommand } from "../index";

export const messageCreateEvent: BotEvent = {
  name: Events.MessageCreate,
  async execute(msg: unknown) {
    const message = msg as Message;

    if (message.author.bot) return;

    const prefix = "!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    logger.info({ commandName, author: message.author.tag }, "Prefix command received");

    if (commandName === "ping") {
      const latency = Date.now() - message.createdTimestamp;
      await message.reply(`Pong! Latency: ${latency}ms`);
      return;
    }

    if (commandName === "help") {
      await message.reply(
        "**Available Commands**\n" +
        "`/ping` — Check bot latency\n" +
        "`/help` — Show this help message\n" +
        "`!ping` — Prefix ping command\n" +
        "`!help` — Prefix help command"
      );
      return;
    }

    if (message.client.commands) {
      const command = message.client.commands.get(commandName) as BotCommand | undefined;
      if (command) {
        await message.reply(`Use the slash command version: \`/${commandName}\``);
      }
    }
  },
};
