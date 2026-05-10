import {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
  type ChatInputCommandInteraction,
} from "discord.js";
import { donateRTK } from "../db/users";
import type { BotCommand } from "../index";

export const donateCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("donate")
    .setDescription("Send RTK tokens to another user")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to donate to").setRequired(true),
    )
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("Amount of RTK to send").setRequired(true).setMinValue(1),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);

    if (target.id === interaction.user.id) {
      await interaction.reply({
        content: "❌ You cannot donate to yourself.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (target.bot) {
      await interaction.reply({
        content: "❌ You cannot donate to bots.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const { from, to } = await donateRTK(interaction.user.id, target.id, amount);

      const embed = new EmbedBuilder()
        .setTitle("💸 RTK Donated")
        .setColor(0x57f287)
        .addFields(
          { name: "From", value: `<@${interaction.user.id}>`, inline: true },
          { name: "To", value: `<@${target.id}>`, inline: true },
          { name: "Amount", value: `${amount} RTK`, inline: true },
          { name: "Your New Balance", value: `${from.rtk} RTK`, inline: true },
          { name: `${target.username}'s New Balance`, value: `${to.rtk} RTK`, inline: true },
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      await interaction.editReply({ content: `❌ ${msg}` });
    }
  },
};
