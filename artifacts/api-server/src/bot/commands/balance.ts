import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { getOrCreateUser } from "../db/users";
import type { BotCommand } from "../index";

const MESSAGES_PER_RTK = 100;

function progressBar(current: number, total: number, length = 10): string {
  const filled = Math.round((current / total) * length);
  return "█".repeat(filled) + "░".repeat(length - filled);
}

export const balanceCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check RTK balance, message progress, and invite count")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to check (defaults to you)").setRequired(false),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user") ?? interaction.user;

    if (target.bot) {
      await interaction.reply({ content: "❌ Bots don't have balances.", flags: MessageFlags.Ephemeral });
      return;
    }

    const user = await getOrCreateUser(target.id);
    const progress = user.messages;
    const bar = progressBar(progress, MESSAGES_PER_RTK);

    const embed = new EmbedBuilder()
      .setTitle(`💰 Balance — ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x5865f2)
      .addFields(
        { name: "RTK Balance", value: `**${user.rtk} RTK**`, inline: true },
        { name: "Invites", value: `**${user.invites}**`, inline: true },
        { name: "\u200b", value: "\u200b", inline: true },
        {
          name: `Message Progress (${progress}/${MESSAGES_PER_RTK})`,
          value: `\`${bar}\` — ${MESSAGES_PER_RTK - progress} messages until next RTK`,
          inline: false,
        },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
