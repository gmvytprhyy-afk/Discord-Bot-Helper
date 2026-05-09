import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { addRTK, getOrCreateUser } from "../db/users";
import type { BotCommand } from "../index";

export const addRtkCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("addrtk")
    .setDescription("Add RTK tokens to a user (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("The user to add RTK to").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount of RTK to add")
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({ content: "❌ You need **Administrator** permission to use this command.", ephemeral: true });
      return;
    }

    const target = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);

    if (target.bot) {
      await interaction.reply({ content: "❌ You cannot add RTK to a bot.", ephemeral: true });
      return;
    }

    await getOrCreateUser(target.id);
    const updated = await addRTK(target.id, amount);

    const embed = new EmbedBuilder()
      .setTitle("✅ RTK Added")
      .setColor(0x57f287)
      .addFields(
        { name: "User", value: `<@${target.id}>`, inline: true },
        { name: "Added", value: `+${amount} RTK`, inline: true },
        { name: "New Balance", value: `${updated.rtk} RTK`, inline: true },
      )
      .setFooter({ text: `Action by ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
