import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../index";

export const pingCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is alive and see latency"),

  async execute(interaction: ChatInputCommandInteraction) {
    const latency = Date.now() - interaction.createdTimestamp;
    const apiLatency = Math.round(interaction.client.ws.ping);
    await interaction.reply(
      `Pong! 🏓\nBot latency: \`${latency}ms\`\nAPI latency: \`${apiLatency}ms\``
    );
  },
};
