import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../index";

export const pingCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is alive"),
  async execute(interaction: ChatInputCommandInteraction) {
    const latency = Date.now() - interaction.createdTimestamp;
    await interaction.reply(`Pong! Latency: ${latency}ms`);
  },
};
