import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { removeRTK, getOrCreateUser } from "../db/users";
import type { BotCommand } from "../index";

export const subRtkCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("subrtk")
    .setDescription("Remove RTK tokens from a user (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to remove RTK from").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount of RTK to remove")
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "❌ You need **Administrator** permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);

    if (target.bot) {
      await interaction.reply({
        content: "❌ You cannot remove RTK from a bot.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = await getOrCreateUser(target.id);

    if (user.rtk < amount) {
      await interaction.reply({
        content: `❌ **<@${target.id}>** only has **${user.rtk} RTK** — cannot subtract **${amount}**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const updated = await removeRTK(target.id, amount);

    const embed = new EmbedBuilder()
      .setTitle("✅ RTK Removed")
      .setColor(0xed4245)
      .addFields(
        { name: "User", value: `<@${target.id}>`, inline: true },
        { name: "Removed", value: `-${amount} RTK`, inline: true },
        { name: "New Balance", value: `${updated.rtk} RTK`, inline: true },
      )
      .setFooter({ text: `Action by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
