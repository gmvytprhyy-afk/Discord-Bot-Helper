import {
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getLeaderboard } from "../db/users";
import type { BotCommand } from "../index";

const MEDALS = ["🥇", "🥈", "🥉"];

export const leaderboardCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the top 10 users by RTK balance"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const top = await getLeaderboard(10);

    if (top.length === 0) {
      await interaction.editReply({ content: "No users have any RTK yet!" });
      return;
    }

    const lines = top.map((u, i) => {
      const medal = MEDALS[i] ?? `**${i + 1}.**`;
      return `${medal} <@${u.discordId}> — **${u.rtk} RTK**`;
    });

    const embed = new EmbedBuilder()
      .setTitle("🏆 RTK Leaderboard")
      .setColor(0xfee75c)
      .setDescription(lines.join("\n"))
      .setFooter({ text: `Top ${top.length} users` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
