import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type GuildChannel,
} from "discord.js";
import { logger } from "../../lib/logger";
import type { BotCommand } from "../index";

function isInTicketsCategory(channel: GuildChannel): boolean {
  if (!channel.parentId) return false;
  const parent = channel.guild.channels.cache.get(channel.parentId);
  return !!parent && parent.name.toLowerCase() === "tickets";
}

export const addMemberCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("addmember")
    .setDescription("Add a member to this ticket channel")
    .addUserOption((o) =>
      o.setName("user").setDescription("User to add to the ticket").setRequired(true),
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel as GuildChannel;

    if (!isInTicketsCategory(channel)) {
      await interaction.reply({
        content: "❌ This command can only be used inside a ticket channel.",
        ephemeral: true,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "❌ You need Manage Channels permission.", ephemeral: true });
      return;
    }

    const target = interaction.options.getUser("user", true);

    if (target.bot) {
      await interaction.reply({ content: "❌ Cannot add bots to tickets.", ephemeral: true });
      return;
    }

    await interaction.deferReply();

    await channel.permissionOverwrites.create(target.id, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
    });

    const embed = new EmbedBuilder()
      .setTitle("👤 Member Added")
      .setColor(0x5865f2)
      .setDescription(`<@${target.id}> has been added to this ticket by <@${interaction.user.id}>.`)
      .setTimestamp();

    logger.info(
      { channelId: channel.id, addedBy: interaction.user.id, targetId: target.id },
      "Member added to ticket",
    );

    await interaction.editReply({ embeds: [embed] });
  },
};
