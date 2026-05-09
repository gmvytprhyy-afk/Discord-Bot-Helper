import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import type { BotCommand } from "../index";

export const helpCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show all available commands"),

  async execute(interaction: ChatInputCommandInteraction) {
    const embed = new EmbedBuilder()
      .setTitle("📖 Bot Commands")
      .setColor(0x5865f2)
      .setDescription("Here are all available commands:")
      .addFields(
        {
          name: "Slash Commands",
          value: [
            "`/ping` — Check bot latency",
            "`/help` — Show this help message",
          ].join("\n"),
        },
        {
          name: "Prefix Commands (`!`)",
          value: [
            "`!ping` — Ping with latency",
            "`!help` — Show this help message",
          ].join("\n"),
        }
      )
      .setFooter({ text: "More commands coming soon!" })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
