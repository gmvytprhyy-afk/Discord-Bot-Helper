import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
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
        ephemeral: true,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({ content: "❌ You need Manage Channels permission.", ephemeral: true });
      return;
    }

    const ticket = await getTicketByChannelId(channel.id);

    if (ticket?.status === "claimed") {
      await interaction.reply({ content: "⚠️ This ticket is already claimed.", ephemeral: true });
      return;
    }

    if (ticket?.status === "closed") {
      await interaction.reply({ content: "⚠️ This ticket is already closed.", ephemeral: true });
      return;
    }

    await interaction.deferReply();

    await updateTicketStatus(channel.id, "claimed");

    const newName = `claimed-${channel.name}`.slice(0, 99);
    await channel.setName(newName).catch(() => null);

    const embed = new EmbedBuilder()
      .setTitle("✅ Ticket Claimed")
      .setColor(0x57f287)
      .setDescription(`This ticket has been claimed by <@${interaction.user.id}>.`)
      .addFields(
        ticket
          ? [
              { name: "Item", value: ticket.itemName, inline: true },
              { name: "Type", value: ticket.type, inline: true },
              { name: "Opened by", value: `<@${ticket.userId}>`, inline: true },
            ]
          : [],
      )
      .setTimestamp();

    logger.info({ channelId: channel.id, claimedBy: interaction.user.id }, "Ticket claimed");

    await interaction.editReply({ embeds: [embed] });
  },
};
