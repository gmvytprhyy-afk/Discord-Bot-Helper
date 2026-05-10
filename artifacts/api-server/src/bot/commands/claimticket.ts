import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  MessageFlags,
  type ChatInputCommandInteraction,
  type GuildChannel,
} from "discord.js";
import { logger } from "../../lib/logger";
import { getTicketByChannelId, updateTicketStatus } from "../db/shop";
import type { BotCommand } from "../index";

function isInTicketsCategory(channel: GuildChannel): boolean {
  if (!channel.parentId) return false;
  const parent = channel.guild.channels.cache.get(channel.parentId);
  return !!parent && parent.name.toLowerCase() === "tickets";
}

export const claimTicketCommand: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("claimticket")
    .setDescription("Claim this ticket — marks you as the handling staff member"),

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.channel as GuildChannel;

    if (!isInTicketsCategory(channel)) {
      await interaction.reply({
        content: "❌ This command can only be used inside a ticket channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: "❌ You need Manage Channels permission.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const ticket = await getTicketByChannelId(channel.id);

    if (ticket?.status === "claimed") {
      await interaction.reply({
        content: "⚠️ This ticket is already claimed.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (ticket?.status === "closed") {
      await interaction.reply({
        content: "⚠️ This ticket is already closed.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    await updateTicketStatus(channel.id, "claimed");
    await channel.setName(`claimed-${channel.name}`.slice(0, 99)).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle("✅ Ticket Claimed")
      .setColor(0x57f287)
      .setDescription(`This ticket has been claimed by <@${interaction.user.id}>.`);

    if (ticket) {
      embed.addFields(
        { name: "Item", value: ticket.itemName, inline: true },
        { name: "Type", value: ticket.type, inline: true },
        { name: "Opened by", value: `<@${ticket.userId}>`, inline: true },
      );
    }

    embed.setTimestamp();

    logger.info({ channelId: channel.id, claimedBy: interaction.user.id }, "Ticket claimed");

    await interaction.editReply({ embeds: [embed] });
  },
};
