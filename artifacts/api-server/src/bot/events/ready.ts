import { Events, type Client } from "discord.js";
import { logger } from "../../lib/logger";
import { registerSlashCommands } from "../register-commands";
import type { BotEvent } from "../index";

export const readyEvent: BotEvent = {
  name: Events.ClientReady,
  once: true,
  async execute(client: unknown) {
    const readyClient = client as Client<true>;
    logger.info({ tag: readyClient.user.tag }, "Discord bot is online");

    try {
      await registerSlashCommands(readyClient.user.id);
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }
  },
};
