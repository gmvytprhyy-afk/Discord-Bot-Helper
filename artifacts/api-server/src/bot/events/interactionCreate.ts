import { Events, type Interaction } from "discord.js";
import { logger } from "../../lib/logger";
import type { BotEvent, BotCommand } from "../index";

export const interactionCreateEvent: BotEvent = {
  name: Events.InteractionCreate,
  async execute(i: unknown) {
    const interaction = i as Interaction;

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands?.get(interaction.commandName) as
      | BotCommand
      | undefined;

    if (!command) {
      logger.warn({ commandName: interaction.commandName }, "Unknown slash command");
      await interaction.reply({ content: "Unknown command.", ephemeral: true });
      return;
    }

    logger.info(
      { commandName: interaction.commandName, user: interaction.user.tag },
      "Slash command received",
    );

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error({ err, commandName: interaction.commandName }, "Command execution error");
      const msg = { content: "Something went wrong running that command.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(msg);
      } else {
        await interaction.reply(msg);
      }
    }
  },
};
