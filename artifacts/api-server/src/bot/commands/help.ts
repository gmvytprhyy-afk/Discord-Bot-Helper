import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from "discord.js";
import type { BotCommand } from "../index";

export const helpCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),
  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("Bot Commands")
      .setColor(0x5865f2)
      .addFields(
        { name: "/ping", value: "Check if the bot is alive and see latency", inline: false },
        { name: "/help", value: "Show this help message", inline: false },
        { name: "!ping (prefix)", value: "Classic prefix command — bot replies with Pong!", inline: false },
      )
      .setFooter({ text: "More commands coming soon!" });

    await interaction.reply({ embeds: [embed] });
  },
};
