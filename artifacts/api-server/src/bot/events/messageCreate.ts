import { Events, type Message } from "discord.js";
import { logger } from "../../lib/logger";
import { incrementMessages } from "../db/users";
import type { BotEvent } from "../index";

export const messageCreateEvent: BotEvent = {
  name: Events.MessageCreate,
  async execute(msg: unknown) {
    const message = msg as Message;

    if (message.author.bot) return;

    // Don't track DMs — only count guild messages
    if (!message.inGuild()) return;

    incrementMessages(message.author.id)
      .then(({ earnedRTK, totalRtk }) => {
        if (earnedRTK) {
          message
            .reply(
              `🎉 You've sent 100 messages and earned **1 RTK token**! You now have **${totalRtk} RTK**.`,
            )
            .catch((err) => {
              logger.error({ err }, "Failed to send RTK reward message");
            });
        }
      })
      .catch((err) => {
        logger.error({ err, discordId: message.author.id }, "Failed to increment message count");
      });

    const prefix = "!";
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    if (commandName === "ping") {
      const latency = Date.now() - message.createdTimestamp;
      await message.reply(`Pong! \`${latency}ms\``);
    }
  },
};
